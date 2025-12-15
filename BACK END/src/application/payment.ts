import Stripe from "stripe";
import { NextFunction, Request, Response } from "express";
import { Invoice } from "../infrastructure/entities/Invoice";
import { NotFoundError, ValidationError } from "../domain/errors/errors";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const createCheckoutSession = async (
  req: Request, 
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("[Checkout] Request body:", req.body);
    
    const { invoiceId } = req.body;
    
    if (!invoiceId) {
      return res.status(400).json({ error: "invoiceId is required" });
    }

    // 1. Get invoice
    const invoice = await Invoice.findById(invoiceId);
    console.log("[Checkout] Found invoice:", invoice);

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    if (invoice.paymentStatus === "PAID") {
      return res.status(400).json({ error: "Invoice already paid" });
    }

    // Check required env vars
    if (!process.env.STRIPE_PRICE_ID) {
      console.error("[Checkout] STRIPE_PRICE_ID is not set!");
      return res.status(500).json({ error: "Payment configuration error" });
    }

    console.log("[Checkout] Creating Stripe session with:", {
      priceId: process.env.STRIPE_PRICE_ID,
      quantity: Math.round(invoice.totalEnergyGenerated),
      returnUrl: `${process.env.FRONTEND_URL}/dashboard/invoices/complete`,
    });

    // 2. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: Math.round(invoice.totalEnergyGenerated) || 1,
        },
      ],
      mode: "payment",
      return_url: `${process.env.FRONTEND_URL}/dashboard/invoices/complete?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        invoiceId: invoice._id.toString(),
      },
    });

    console.log("[Checkout] Session created:", session.id);

    // 3. Return client secret to frontend
    res.json({ clientSecret: session.client_secret });
  } catch (error: any) {
    console.error("[Checkout] Error:", error.message);
    res.status(500).json({ 
      error: "Failed to create checkout session",
      details: error.message 
    });
  }
};

export const getSessionStatus = async (req: Request, res: Response) => {
  const { session_id } = req.query;

  if (!session_id || typeof session_id !== "string") {
    return res.status(400).json({ 
      error: "Missing session_id query parameter" 
    });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    res.json({
      status: session.status ?? "unknown",
      paymentStatus: session.payment_status ?? "unknown",
      amountTotal: session.amount_total ?? 0,  // Amount in cents
      invoiceId: session.metadata?.invoiceId,  // Include invoice reference
    });
  } catch (error: any) {
    console.error("Error retrieving session:", error.message);
    return res.status(404).json({ 
      error: "Session not found",
      details: error.message 
    });
  }
};

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  // 1. Verify webhook signature (SECURITY: proves request is from Stripe)
  try {
    event = stripe.webhooks.constructEvent(
      req.body,  // Must be raw body, not parsed JSON
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 2. Handle payment completion
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = session.metadata?.invoiceId;

    if (invoiceId && session.payment_status === "paid") {
      await Invoice.findByIdAndUpdate(invoiceId, {
        paymentStatus: "PAID",
        paidAt: new Date(),
      });
      console.log("Invoice marked as PAID:", invoiceId);
    }
  }

  // 3. Always return 200 to acknowledge receipt
  res.status(200).json({ received: true });
};

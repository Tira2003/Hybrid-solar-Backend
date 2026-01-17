import Stripe from "stripe";
import { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { Invoice } from "../infrastructure/entities/Invoice";
import { User } from "../infrastructure/entities/User";
import { AppError, NotFoundError, ForbiddenError, ValidationError } from "../domain/errors/errors";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const createCheckoutSession = async (
  req: Request, 
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("[Checkout] Request body:", req.body);
    
    // Get authenticated user
    const userId = getAuth(req).userId;
    if (!userId) {
      throw new AppError("User not authenticated", 401);
    }

    const { invoiceId } = req.body;
    
    if (!invoiceId) {
      throw new ValidationError("invoiceId is required");
    }

    // Get invoice
    const invoice = await Invoice.findById(invoiceId).populate("userId");
    console.log("[Checkout] Found invoice:", invoice);

    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }

    // Validate invoice belongs to authenticated user
    const user = await User.findOne({ clerkUserId: userId });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Check if invoice belongs to this user
    const invoiceUserId = invoice.userId._id?.toString() || invoice.userId.toString();
    if (invoiceUserId !== user._id.toString()) {
      throw new ForbiddenError("You do not have permission to pay this invoice");
    }

    if (invoice.paymentStatus === "PAID") {
      throw new ValidationError("Invoice already paid");
    }

    // Check required env vars
    if (!process.env.STRIPE_PRICE_ID) {
      console.error("[Checkout] STRIPE_PRICE_ID is not set!");
      throw new AppError("Payment configuration error", 500);
    }

    // Use totalAmount if available, otherwise calculate from energy
    const amountInCents = invoice.totalAmount 
      ? Math.round(invoice.totalAmount * 100) 
      : Math.round(invoice.totalEnergyGenerated * (invoice.ratePerKwh || 0.10) * 100);

    console.log("[Checkout] Creating Stripe session with:", {
      priceId: process.env.STRIPE_PRICE_ID,
      amount: amountInCents,
      returnUrl: `${process.env.FRONTEND_URL}/dashboard/invoices/complete`,
    });

    // Create Stripe Checkout Session
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
        userId: user._id.toString(),
      },
    });

    console.log("[Checkout] Session created:", session.id);

    // Return client secret to frontend
    res.json({ clientSecret: session.client_secret });
  } catch (error) {
    next(error);
  }
};

export const getSessionStatus = async (
  req: Request, 
  res: Response,
  next: NextFunction
) => {
  try {
    const { session_id } = req.query;

    if (!session_id || typeof session_id !== "string") {
      throw new ValidationError("Missing session_id query parameter");
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    res.json({
      status: session.status ?? "unknown",
      paymentStatus: session.payment_status ?? "unknown",
      amountTotal: session.amount_total ?? 0,  // Amount in cents
      invoiceId: session.metadata?.invoiceId,  // Include invoice reference
    });
  } catch (error) {
    next(error);
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
        stripeSessionId: session.id,
      });
      console.log("Invoice marked as PAID:", invoiceId);
    }
  }

  // 3. Always return 200 to acknowledge receipt
  res.status(200).json({ received: true });
};

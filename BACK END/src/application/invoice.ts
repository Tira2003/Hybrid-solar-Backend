import { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { Invoice } from "../infrastructure/entities/Invoice";
import { User } from "../infrastructure/entities/User";
import { NotFoundError } from "../domain/errors/errors";

/**
 * Transform invoice to frontend expected format
 */
const transformInvoice = (invoice: any) => {
  // Map paymentStatus to frontend status format
  let status = "pending";
  if (invoice.paymentStatus === "PAID") {
    status = "paid";
  } else if (invoice.paymentStatus === "FAILED") {
    status = "overdue";
  } else if (invoice.dueDate && new Date(invoice.dueDate) < new Date()) {
    status = "overdue";
  }

  return {
    _id: invoice._id,
    status,
    invoiceNumber: invoice.invoiceNumber,
    kwhGenerated: invoice.totalEnergyGenerated,
    amount: invoice.amount,
    ratePerKwh: invoice.ratePerKwh,
    billingPeriodStart: invoice.billingPeriodStart,
    billingPeriodEnd: invoice.billingPeriodEnd,
    dueDate: invoice.dueDate,
    createdAt: invoice.createdAt,
    paidAt: invoice.paidAt || null,
    solarUnitId: invoice.solarUnitId,
    userId: invoice.userId,
  };
};

/**
 * Get all invoices for the authenticated user
 */
export const getInvoicesForUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = getAuth(req);
    const clerkUserId = auth.userId;

    const user = await User.findOne({ clerkUserId });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Support filtering by status via query param
    const { status } = req.query;
    const filter: Record<string, unknown> = { userId: user._id };
    
    // Map frontend status to backend paymentStatus
    if (status) {
      const statusLower = (status as string).toLowerCase();
      if (statusLower === "paid") {
        filter.paymentStatus = "PAID";
      } else if (statusLower === "pending") {
        filter.paymentStatus = "PENDING";
      } else if (statusLower === "overdue") {
        filter.paymentStatus = "FAILED";
      }
    }

    const invoices = await Invoice.find(filter)
      .populate("solarUnitId", "serialNumber capacity")
      .sort({ createdAt: -1 });

    const transformedInvoices = invoices.map(transformInvoice);
    res.status(200).json(transformedInvoices);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single invoice by ID for the authenticated user
 */
export const getInvoiceById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = getAuth(req);
    const clerkUserId = auth.userId;

    const user = await User.findOne({ clerkUserId });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const { id } = req.params;
    const invoice = await Invoice.findOne({
      _id: id,
      userId: user._id,
    })
      .populate("solarUnitId", "serialNumber capacity status")
      .populate("userId", "firstName lastName email");

    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }

    res.status(200).json(transformInvoice(invoice));
  } catch (error) {
    next(error);
  }
};

/**
 * Get all invoices (admin only)
 * Supports filtering by status query param
 */
export const getAllInvoices = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status } = req.query;
    const filter: Record<string, unknown> = {};

    if (status) {
      const statusLower = (status as string).toLowerCase();
      if (statusLower === "paid") {
        filter.paymentStatus = "PAID";
      } else if (statusLower === "pending") {
        filter.paymentStatus = "PENDING";
      } else if (statusLower === "overdue") {
        filter.paymentStatus = "FAILED";
      }
    }

    const invoices = await Invoice.find(filter)
      .populate("solarUnitId", "serialNumber capacity status")
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 });

    const transformedInvoices = invoices.map(transformInvoice);
    res.status(200).json(transformedInvoices);
  } catch (error) {
    next(error);
  }
};

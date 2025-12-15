import { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { Invoice } from "../infrastructure/entities/Invoice";
import { User } from "../infrastructure/entities/User";
import { NotFoundError } from "../domain/errors/errors";

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
    
    if (status && ["PENDING", "PAID", "FAILED"].includes(status as string)) {
      filter.paymentStatus = status;
    }

    const invoices = await Invoice.find(filter)
      .populate("solarUnitId", "serialNumber capacity")
      .sort({ createdAt: -1 });

    res.status(200).json(invoices);
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

    res.status(200).json(invoice);
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

    if (status && ["PENDING", "PAID", "FAILED"].includes(status as string)) {
      filter.paymentStatus = status;
    }

    const invoices = await Invoice.find(filter)
      .populate("solarUnitId", "serialNumber capacity status")
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.status(200).json(invoices);
  } catch (error) {
    next(error);
  }
};

import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    solarUnitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SolarUnit",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    billingPeriodStart: {
      type: Date,
      required: true,
    },
    billingPeriodEnd: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    totalEnergyGenerated: {
      type: Number,
      required: true,
      min: 0,
    },
    ratePerKwh: {
      type: Number,
      required: true,
      min: 0,
      default: 0.10, // $0.10 per kWh default rate
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "USD",
      enum: ["USD", "EUR", "GBP", "LKR"],
    },
    paymentStatus: {
      type: String,
      required: true,
      enum: ["PENDING", "PAID", "FAILED"],
      default: "PENDING",
    },
    paidAt: {
      type: Date,
      required: false,
    },
    stripeSessionId: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Invoice = mongoose.model("Invoice", invoiceSchema);

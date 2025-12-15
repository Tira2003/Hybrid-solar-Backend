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
  },
  {
    timestamps: true,
  }
);

export const Invoice = mongoose.model("Invoice", invoiceSchema);

import "dotenv/config";
import { connectDB } from "../infrastructure/db";
import { SolarUnit } from "../infrastructure/entities/SolarUnit";
import { Invoice } from "../infrastructure/entities/Invoice";

// Default rate per kWh in dollars
const DEFAULT_RATE_PER_KWH = 0.12;

// Due date is 15 days after billing period ends
const DUE_DATE_DAYS = 15;

/**
 * Generate a unique invoice number
 */
const generateInvoiceNumber = async (): Promise<string> => {
  const count = await Invoice.countDocuments();
  const paddedNumber = String(count + 1).padStart(4, "0");
  return `INV-${paddedNumber}`;
};

/**
 * Seed script to create a test invoice for solar unit SU-0001
 * Usage: npx ts-node src/scripts/seed-test-invoice.ts
 */
const seedTestInvoice = async () => {
  try {
    await connectDB();
    console.log("Connected to database");

    // Find the solar unit with serialNumber "SU-0001"
    const solarUnit = await SolarUnit.findOne({ serialNumber: "SU-0001" });

    if (!solarUnit) {
      console.error("Solar unit SU-0001 not found!");
      process.exit(1);
    }

    console.log("Found solar unit:", solarUnit.serialNumber);

    // Create billing period (current month)
    const now = new Date();
    const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({
      solarUnitId: solarUnit._id,
      billingPeriodStart,
      billingPeriodEnd,
    });

    if (existingInvoice) {
      console.log("Invoice already exists for this period:", existingInvoice._id);
      console.log("Invoice details:", {
        invoiceNumber: existingInvoice.invoiceNumber,
        billingPeriodStart: existingInvoice.billingPeriodStart,
        billingPeriodEnd: existingInvoice.billingPeriodEnd,
        totalEnergyGenerated: existingInvoice.totalEnergyGenerated,
        amount: existingInvoice.amount,
        paymentStatus: existingInvoice.paymentStatus,
      });
      process.exit(0);
    }

    // Calculate values
    const totalEnergyGenerated = 150.5; // Test value: 150.5 kWh
    const ratePerKwh = DEFAULT_RATE_PER_KWH;
    const amount = Math.round(totalEnergyGenerated * ratePerKwh * 100) / 100;
    
    // Due date is 15 days after billing period ends
    const dueDate = new Date(billingPeriodEnd);
    dueDate.setDate(dueDate.getDate() + DUE_DATE_DAYS);

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Create test invoice
    const testInvoice = await Invoice.create({
      solarUnitId: solarUnit._id,
      userId: solarUnit.userId,
      invoiceNumber,
      billingPeriodStart,
      billingPeriodEnd,
      dueDate,
      totalEnergyGenerated,
      ratePerKwh,
      amount,
      paymentStatus: "PENDING",
    });

    console.log("✅ Test invoice created successfully!");
    console.log("Invoice ID:", testInvoice._id);
    console.log("Invoice details:", {
      invoiceNumber: testInvoice.invoiceNumber,
      solarUnitId: testInvoice.solarUnitId,
      userId: testInvoice.userId,
      billingPeriodStart: testInvoice.billingPeriodStart,
      billingPeriodEnd: testInvoice.billingPeriodEnd,
      dueDate: testInvoice.dueDate,
      totalEnergyGenerated: testInvoice.totalEnergyGenerated,
      ratePerKwh: testInvoice.ratePerKwh,
      amount: testInvoice.amount,
      paymentStatus: testInvoice.paymentStatus,
    });

    process.exit(0);
  } catch (error) {
    console.error("Error seeding test invoice:", error);
    process.exit(1);
  }
};

seedTestInvoice();

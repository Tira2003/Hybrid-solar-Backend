import "dotenv/config";
import { connectDB } from "../infrastructure/db";
import { SolarUnit } from "../infrastructure/entities/SolarUnit";
import { Invoice } from "../infrastructure/entities/Invoice";

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
        billingPeriodStart: existingInvoice.billingPeriodStart,
        billingPeriodEnd: existingInvoice.billingPeriodEnd,
        totalEnergyGenerated: existingInvoice.totalEnergyGenerated,
        paymentStatus: existingInvoice.paymentStatus,
      });
      process.exit(0);
    }

    // Create test invoice
    const testInvoice = await Invoice.create({
      solarUnitId: solarUnit._id,
      userId: solarUnit.userId,
      billingPeriodStart,
      billingPeriodEnd,
      totalEnergyGenerated: 150.5, // Test value: 150.5 kWh
      paymentStatus: "PENDING",
    });

    console.log("✅ Test invoice created successfully!");
    console.log("Invoice ID:", testInvoice._id);
    console.log("Invoice details:", {
      solarUnitId: testInvoice.solarUnitId,
      userId: testInvoice.userId,
      billingPeriodStart: testInvoice.billingPeriodStart,
      billingPeriodEnd: testInvoice.billingPeriodEnd,
      totalEnergyGenerated: testInvoice.totalEnergyGenerated,
      paymentStatus: testInvoice.paymentStatus,
    });

    process.exit(0);
  } catch (error) {
    console.error("Error seeding test invoice:", error);
    process.exit(1);
  }
};

seedTestInvoice();

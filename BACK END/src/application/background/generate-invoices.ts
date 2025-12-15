import { SolarUnit } from "../../infrastructure/entities/SolarUnit";
import { EnergyGenerationRecord } from "../../infrastructure/entities/EnergyGenerationRecord";
import { Invoice } from "../../infrastructure/entities/Invoice";

/**
 * Calculate billing period based on installation date
 * Returns the start and end dates for the current billing month
 */
const calculateBillingPeriod = (installationDate: Date): { start: Date; end: Date } => {
  const now = new Date();
  
  // Billing period is the previous month
  const billingMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const billingYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  
  // Start of billing period (1st of the month or installation date if later)
  const periodStart = new Date(billingYear, billingMonth, 1, 0, 0, 0, 0);
  
  // If installation date is after period start, use installation date
  const effectiveStart = installationDate > periodStart ? installationDate : periodStart;
  
  // End of billing period (last day of the month at 23:59:59)
  const periodEnd = new Date(billingYear, billingMonth + 1, 0, 23, 59, 59, 999);
  
  return { start: effectiveStart, end: periodEnd };
};

/**
 * Generate monthly invoices for all active solar units
 * - Queries all active solar units
 * - Calculates billing period based on installation date
 * - Sums energy generation records for that period
 * - Creates invoice with PENDING status
 */
export const generateInvoices = async () => {
  try {
    // Query all active solar units
    const activeSolarUnits = await SolarUnit.find({ status: "ACTIVE" });
    
    console.log(`[Invoice Generator] Found ${activeSolarUnits.length} active solar units`);
    
    let invoicesCreated = 0;
    let invoicesSkipped = 0;

    for (const solarUnit of activeSolarUnits) {
      try {
        const { start: billingPeriodStart, end: billingPeriodEnd } = calculateBillingPeriod(
          solarUnit.installationDate
        );

        // Check if invoice already exists for this period
        const existingInvoice = await Invoice.findOne({
          solarUnitId: solarUnit._id,
          billingPeriodStart,
          billingPeriodEnd,
        });

        if (existingInvoice) {
          console.log(
            `[Invoice Generator] Invoice already exists for solar unit ${solarUnit.serialNumber} - Period: ${billingPeriodStart.toISOString()} to ${billingPeriodEnd.toISOString()}`
          );
          invoicesSkipped++;
          continue;
        }

        // Sum energy generation records for the billing period
        const energyRecords = await EnergyGenerationRecord.aggregate([
          {
            $match: {
              solarUnitId: solarUnit._id,
              timestamp: {
                $gte: billingPeriodStart,
                $lte: billingPeriodEnd,
              },
            },
          },
          {
            $group: {
              _id: null,
              totalEnergyGenerated: { $sum: "$energyGenerated" },
            },
          },
        ]);

        const totalEnergyGenerated = energyRecords.length > 0 
          ? energyRecords[0].totalEnergyGenerated 
          : 0;

        // Skip creating invoice if no energy was generated
        if (totalEnergyGenerated === 0) {
          console.log(
            `[Invoice Generator] No energy generated for solar unit ${solarUnit.serialNumber} during billing period - skipping invoice`
          );
          invoicesSkipped++;
          continue;
        }

        // Create invoice with PENDING status
        const invoice = new Invoice({
          solarUnitId: solarUnit._id,
          userId: solarUnit.userId,
          billingPeriodStart,
          billingPeriodEnd,
          totalEnergyGenerated,
          paymentStatus: "PENDING",
        });

        await invoice.save();
        invoicesCreated++;

        console.log(
          `[Invoice Generator] Created invoice for solar unit ${solarUnit.serialNumber} - Energy: ${totalEnergyGenerated} kWh`
        );
      } catch (unitError) {
        console.error(
          `[Invoice Generator] Error processing solar unit ${solarUnit.serialNumber}:`,
          unitError
        );
      }
    }

    console.log(
      `[Invoice Generator] Completed - Created: ${invoicesCreated}, Skipped: ${invoicesSkipped}`
    );

    return { invoicesCreated, invoicesSkipped };
  } catch (error) {
    console.error("[Invoice Generator] Job error:", error);
    throw error;
  }
};

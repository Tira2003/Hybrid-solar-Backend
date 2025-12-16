import cron from 'node-cron';
import { syncEnergyGenerationRecords } from '../application/background/sync-energy-generation-records';
import { generateInvoices } from '../application/background/generate-invoices';
import { runAnomalyDetection } from '../application/background/anomaly-detection';

export const initializeScheduler = () => {
  // Run daily at 00:00 (midnight) - cron expression: '0 0 * * *'
  const syncSchedule = process.env.SYNC_CRON_SCHEDULE || '0 0 * * *';

  cron.schedule(syncSchedule, async () => {
    console.log(`[${new Date().toISOString()}] Starting daily energy generation records sync...`);
    try {
      await syncEnergyGenerationRecords();
      console.log(`[${new Date().toISOString()}] Daily sync completed successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Daily sync failed:`, error);
    }
  });

  console.log(`[Scheduler] Energy generation records sync scheduled for: ${syncSchedule}`);

  // Run monthly on the 1st at 00:00 (midnight) - cron expression: '0 0 1 * *'
  const invoiceSchedule = process.env.INVOICE_CRON_SCHEDULE || '0 0 1 * *';

  cron.schedule(invoiceSchedule, async () => {
    console.log(`[${new Date().toISOString()}] Starting monthly invoice generation...`);
    try {
      await generateInvoices();
      console.log(`[${new Date().toISOString()}] Monthly invoice generation completed successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Monthly invoice generation failed:`, error);
    }
  });

  console.log(`[Scheduler] Invoice generation scheduled for: ${invoiceSchedule}`);

  // Run anomaly detection daily at 01:00 (1 AM) - after energy sync
  const anomalySchedule = process.env.ANOMALY_CRON_SCHEDULE || '0 1 * * *';

  cron.schedule(anomalySchedule, async () => {
    console.log(`[${new Date().toISOString()}] Starting daily anomaly detection...`);
    try {
      await runAnomalyDetection();
      console.log(`[${new Date().toISOString()}] Daily anomaly detection completed successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Daily anomaly detection failed:`, error);
    }
  });

  console.log(`[Scheduler] Anomaly detection scheduled for: ${anomalySchedule}`);
};

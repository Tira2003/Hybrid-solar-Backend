import "dotenv/config";
import express from "express";
import energyGenerationRecordRouter from "./api/energy-generation-record";
import { globalErrorHandler } from "./api/middlewares/global-error-handling-middleware";
import { loggerMiddleware } from "./api/middlewares/logger-middleware";
import solarUnitRouter from "./api/solar-unit";
import invoiceRouter from "./api/invoice";
import { connectDB } from "./infrastructure/db";
import { initializeScheduler } from "./infrastructure/scheduler";
import cors from "cors";
import webhooksRouter from "./api/webhooks";
import { clerkMiddleware } from "@clerk/express";
import usersRouter from "./api/users";
import weatherRouter from "./api/weather";
import { handleStripeWebhook } from "./application/payment";
import paymentRoutes from "./api/payment";
import anomalyRouter from "./api/anomaly";
import adminDashboardRouter from "./api/admin-dashboard";

const server = express();
server.use(cors({ 
  origin: [
    "http://localhost:5173",
    "https://fed-4-front-end-tiranga.netlify.app"
  ] 
}));


server.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);


server.use(loggerMiddleware);

server.use("/api/webhooks", webhooksRouter);

server.use(clerkMiddleware())

server.use(express.json());

server.use("/api/solar-units", solarUnitRouter);
server.use("/api/energy-generation-records", energyGenerationRecordRouter);
server.use("/api/users", usersRouter);
server.use("/api/weather", weatherRouter);
server.use("/api/invoices", invoiceRouter);
server.use("/api/payments", paymentRoutes);
server.use("/api/anomalies", anomalyRouter);
server.use("/api/admin", adminDashboardRouter);

server.use(globalErrorHandler);

connectDB();
initializeScheduler();

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log("Server is running on port :",PORT);
});
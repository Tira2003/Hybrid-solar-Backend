import express from "express";
import {
  getAdminDashboardStats,
  getAdminEnergyGeneration,
  getAdminPendingInvoices,
  getAdminCriticalAnomalies
} from "../application/admin-dashboard";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";
import { authorizationMiddleware } from "./middlewares/authorization-middleware";

const adminDashboardRouter = express.Router();

// All routes require authentication and admin authorization
adminDashboardRouter.use(authenticationMiddleware, authorizationMiddleware);

// Dashboard statistics
adminDashboardRouter.get("/dashboard-stats", getAdminDashboardStats);

// Energy generation data
adminDashboardRouter.get("/energy-generation", getAdminEnergyGeneration);

// Pending invoices
adminDashboardRouter.get("/pending-invoices", getAdminPendingInvoices);

// Critical anomalies
adminDashboardRouter.get("/critical-anomalies", getAdminCriticalAnomalies);

export default adminDashboardRouter;

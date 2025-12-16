import express from "express";
import { requireAuth } from "@clerk/express";
import {
  getAnomaliesForUser,
  getAllAnomalies,
  getAnomalyById,
  acknowledgeAnomaly,
  resolveAnomaly,
  getAnomalyStats,
  triggerSyncAndDetect,
} from "../application/anomaly";

const anomalyRouter = express.Router();

// Trigger routes (must be before /:id to avoid route conflict)
anomalyRouter.post("/trigger/sync-and-detect", requireAuth(), triggerSyncAndDetect);

// User routes (require authentication)
anomalyRouter.get("/", requireAuth(), getAnomaliesForUser);
anomalyRouter.get("/stats", requireAuth(), getAnomalyStats);
anomalyRouter.get("/:id", requireAuth(), getAnomalyById);
anomalyRouter.put("/:id/acknowledge", requireAuth(), acknowledgeAnomaly);
anomalyRouter.put("/:id/resolve", requireAuth(), resolveAnomaly);

// Admin routes (require authentication - additional admin check can be added)
anomalyRouter.get("/admin/all", requireAuth(), getAllAnomalies);

export default anomalyRouter;

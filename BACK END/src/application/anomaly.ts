import { NextFunction, Request, Response } from "express";
import { Anomaly, ANOMALY_STATUS } from "../infrastructure/entities/Anomaly";
import { SolarUnit } from "../infrastructure/entities/SolarUnit";
import { User } from "../infrastructure/entities/User";
import { AppError } from "../domain/errors/errors";
import { syncEnergyGenerationRecords } from "./background/sync-energy-generation-records";
import { runAnomalyDetection } from "./background/anomaly-detection";

/**
 * Get anomalies for the authenticated user's solar unit(s)
 * Supports filtering by type, severity, and status
 */
export const getAnomaliesForUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.auth as any)?.userId;

    if (!userId) {
      throw new AppError("User not authenticated", 401);
    }

    // Get user from Clerk userId
    const user = await User.findOne({ clerkUserId: userId });
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Get user's solar units
    const solarUnits = await SolarUnit.find({ userId: user._id });
    if (solarUnits.length === 0) {
      return res.status(200).json([]);
    }

    const solarUnitIds = solarUnits.map((unit) => unit._id);

    // Build filter query
    const filter: any = { solarUnitId: { $in: solarUnitIds } };

    // Apply optional filters from query params
    const { type, severity, status } = req.query;

    if (type) {
      filter.anomalyType = type;
    }
    if (severity) {
      filter.severity = severity;
    }
    if (status) {
      filter.status = status;
    }

    const anomalies = await Anomaly.find(filter)
      .populate("solarUnitId", "serialNumber capacity")
      .sort({ detectedAt: -1 })
      .limit(100);

    res.status(200).json(anomalies);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all anomalies (admin only)
 * Supports filtering by type, severity, and status
 */
export const getAllAnomalies = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Build filter query
    const filter: any = {};

    // Apply optional filters from query params
    const { type, severity, status, solarUnitId } = req.query;

    if (type) {
      filter.anomalyType = type;
    }
    if (severity) {
      filter.severity = severity;
    }
    if (status) {
      filter.status = status;
    }
    if (solarUnitId) {
      filter.solarUnitId = solarUnitId;
    }

    const anomalies = await Anomaly.find(filter)
      .populate("solarUnitId", "serialNumber capacity")
      .sort({ detectedAt: -1 })
      .limit(200);

    res.status(200).json(anomalies);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single anomaly by ID
 */
export const getAnomalyById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const anomaly = await Anomaly.findById(id)
      .populate("solarUnitId", "serialNumber capacity status");

    if (!anomaly) {
      throw new AppError("Anomaly not found", 404);
    }

    res.status(200).json(anomaly);
  } catch (error) {
    next(error);
  }
};

/**
 * Acknowledge an anomaly
 */
export const acknowledgeAnomaly = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = (req.auth as any)?.userId;

    const anomaly = await Anomaly.findById(id);

    if (!anomaly) {
      throw new AppError("Anomaly not found", 404);
    }

    if ((anomaly as any).status === ANOMALY_STATUS.RESOLVED) {
      throw new AppError("Cannot acknowledge a resolved anomaly", 400);
    }

    (anomaly as any).status = ANOMALY_STATUS.ACKNOWLEDGED;
    (anomaly as any).acknowledgedAt = new Date();
    (anomaly as any).acknowledgedBy = userId;

    await anomaly.save();

    res.status(200).json(anomaly);
  } catch (error) {
    next(error);
  }
};

/**
 * Resolve an anomaly
 */
export const resolveAnomaly = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = (req.auth as any)?.userId;
    const { notes } = req.body;

    const anomaly = await Anomaly.findById(id);

    if (!anomaly) {
      throw new AppError("Anomaly not found", 404);
    }

    (anomaly as any).status = ANOMALY_STATUS.RESOLVED;
    (anomaly as any).resolvedAt = new Date();
    (anomaly as any).resolvedBy = userId;
    
    if (notes) {
      (anomaly as any).details = {
        ...(anomaly as any).details,
        resolutionNotes: notes,
      };
    }

    await anomaly.save();

    res.status(200).json(anomaly);
  } catch (error) {
    next(error);
  }
};

/**
 * Get anomaly statistics for dashboard
 */
export const getAnomalyStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.auth as any)?.userId;

    // Build base filter
    let solarUnitFilter: any = {};

    if (userId) {
      const user = await User.findOne({ clerkUserId: userId });
      if (user) {
        const solarUnits = await SolarUnit.find({ userId: user._id });
        if (solarUnits.length > 0) {
          solarUnitFilter = { solarUnitId: { $in: solarUnits.map(u => u._id) } };
        }
      }
    }

    const [
      totalActive,
      totalAcknowledged,
      totalResolved,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      byType
    ] = await Promise.all([
      Anomaly.countDocuments({ ...solarUnitFilter, status: ANOMALY_STATUS.ACTIVE }),
      Anomaly.countDocuments({ ...solarUnitFilter, status: ANOMALY_STATUS.ACKNOWLEDGED }),
      Anomaly.countDocuments({ ...solarUnitFilter, status: ANOMALY_STATUS.RESOLVED }),
      Anomaly.countDocuments({ ...solarUnitFilter, severity: "CRITICAL", status: { $ne: ANOMALY_STATUS.RESOLVED } }),
      Anomaly.countDocuments({ ...solarUnitFilter, severity: "HIGH", status: { $ne: ANOMALY_STATUS.RESOLVED } }),
      Anomaly.countDocuments({ ...solarUnitFilter, severity: "MEDIUM", status: { $ne: ANOMALY_STATUS.RESOLVED } }),
      Anomaly.countDocuments({ ...solarUnitFilter, severity: "LOW", status: { $ne: ANOMALY_STATUS.RESOLVED } }),
      Anomaly.aggregate([
        { $match: { ...solarUnitFilter, status: { $ne: ANOMALY_STATUS.RESOLVED } } },
        { $group: { _id: "$anomalyType", count: { $sum: 1 } } }
      ])
    ]);

    res.status(200).json({
      byStatus: {
        active: totalActive,
        acknowledged: totalAcknowledged,
        resolved: totalResolved,
      },
      bySeverity: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
      byType: byType.reduce((acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      total: totalActive + totalAcknowledged,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger sync and anomaly detection manually
 * Called when user clicks "Sync Data" button
 */
export const triggerSyncAndDetect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log(`[Manual Trigger] Starting sync and detect...`);
    
    // Run sync first
    await syncEnergyGenerationRecords();
    console.log(`[Manual Trigger] Sync completed`);
    
    // Then run anomaly detection
    await runAnomalyDetection();
    console.log(`[Manual Trigger] Anomaly detection completed`);
    
    res.status(200).json({
      success: true,
      message: "Sync and anomaly detection completed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[Manual Trigger] Error:`, error);
    next(error);
  }
};

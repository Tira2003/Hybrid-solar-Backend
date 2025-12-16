import { NextFunction, Request, Response } from "express";
import { SolarUnit } from "../infrastructure/entities/SolarUnit";
import { User } from "../infrastructure/entities/User";
import { Invoice } from "../infrastructure/entities/Invoice";
import { Anomaly, ANOMALY_STATUS } from "../infrastructure/entities/Anomaly";
import { EnergyGenerationRecord } from "../infrastructure/entities/EnergyGenerationRecord";

/**
 * Get admin dashboard statistics
 * Returns aggregated counts for solar units, users, invoices, and anomalies
 */
export const getAdminDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get solar units by status
    const [
      activeSolarUnits,
      maintenanceSolarUnits,
      inactiveSolarUnits,
      totalUsers,
      pendingInvoices,
      criticalAnomalies,
      highAnomalies,
      totalActiveAnomalies
    ] = await Promise.all([
      SolarUnit.countDocuments({ status: "ACTIVE" }),
      SolarUnit.countDocuments({ status: "MAINTENANCE" }),
      SolarUnit.countDocuments({ status: "INACTIVE" }),
      User.countDocuments({}),
      Invoice.countDocuments({ paymentStatus: "PENDING" }),
      Anomaly.countDocuments({ severity: "CRITICAL", status: { $ne: ANOMALY_STATUS.RESOLVED } }),
      Anomaly.countDocuments({ severity: "HIGH", status: { $ne: ANOMALY_STATUS.RESOLVED } }),
      Anomaly.countDocuments({ status: { $ne: ANOMALY_STATUS.RESOLVED } })
    ]);

    const totalSolarUnits = activeSolarUnits + maintenanceSolarUnits + inactiveSolarUnits;

    res.status(200).json({
      solarUnits: {
        total: totalSolarUnits,
        active: activeSolarUnits,
        maintenance: maintenanceSolarUnits,
        inactive: inactiveSolarUnits
      },
      users: {
        total: totalUsers
      },
      invoices: {
        pending: pendingInvoices
      },
      anomalies: {
        total: totalActiveAnomalies,
        critical: criticalAnomalies,
        high: highAnomalies
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get energy generation summary for all solar units
 * Supports groupBy: day, week, month
 */
export const getAdminEnergyGeneration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { groupBy = "day", limit = 7 } = req.query;
    
    let dateFormat: string;
    let daysBack: number;
    
    switch (groupBy) {
      case "month":
        dateFormat = "%Y-%m";
        daysBack = 365;
        break;
      case "week":
        dateFormat = "%Y-W%V";
        daysBack = 84; // 12 weeks
        break;
      default: // day
        dateFormat = "%Y-%m-%d";
        daysBack = Number(limit) || 7;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const energyData = await EnergyGenerationRecord.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: dateFormat, date: "$timestamp" } }
          },
          totalEnergy: { $sum: "$energyGenerated" },
          recordCount: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.date": 1 }
      },
      {
        $limit: Number(limit) || 30
      }
    ]);

    const formattedData = energyData.map(item => ({
      date: item._id.date,
      energy: Math.round(item.totalEnergy * 100) / 100,
      records: item.recordCount
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending invoices for admin dashboard
 */
export const getAdminPendingInvoices = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { limit = 10 } = req.query;

    const invoices = await Invoice.find({ paymentStatus: "PENDING" })
      .populate("solarUnitId", "serialNumber capacity")
      .populate("userId", "firstName lastName email")
      .sort({ dueDate: 1 })
      .limit(Number(limit));

    const transformedInvoices = invoices.map((invoice: any) => {
      const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < new Date();
      return {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        user: invoice.userId ? {
          name: `${invoice.userId.firstName || ''} ${invoice.userId.lastName || ''}`.trim(),
          email: invoice.userId.email
        } : null,
        solarUnit: invoice.solarUnitId ? {
          serialNumber: invoice.solarUnitId.serialNumber,
          capacity: invoice.solarUnitId.capacity
        } : null,
        kwhGenerated: invoice.totalEnergyGenerated,
        dueDate: invoice.dueDate,
        isOverdue,
        createdAt: invoice.createdAt
      };
    });

    res.status(200).json(transformedInvoices);
  } catch (error) {
    next(error);
  }
};

/**
 * Get critical anomalies for admin dashboard
 */
export const getAdminCriticalAnomalies = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { limit = 10 } = req.query;

    const anomalies = await Anomaly.find({
      severity: { $in: ["CRITICAL", "HIGH"] },
      status: { $ne: ANOMALY_STATUS.RESOLVED }
    })
      .populate("solarUnitId", "serialNumber capacity status")
      .sort({ detectedAt: -1 })
      .limit(Number(limit));

    const transformedAnomalies = anomalies.map((anomaly: any) => ({
      _id: anomaly._id,
      type: anomaly.anomalyType,
      severity: anomaly.severity,
      status: anomaly.status,
      solarUnit: anomaly.solarUnitId ? {
        serialNumber: anomaly.solarUnitId.serialNumber,
        capacity: anomaly.solarUnitId.capacity,
        status: anomaly.solarUnitId.status
      } : null,
      detectedAt: anomaly.detectedAt,
      details: anomaly.details
    }));

    res.status(200).json(transformedAnomalies);
  } catch (error) {
    next(error);
  }
};

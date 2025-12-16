import mongoose from "mongoose";

export const ANOMALY_TYPES = {
  COMPLETE_FAILURE: "COMPLETE_FAILURE",
  DEGRADATION: "DEGRADATION",
  WEATHER_RELATED: "WEATHER_RELATED",
  SENSOR_MALFUNCTION: "SENSOR_MALFUNCTION",
} as const;

export const SEVERITY_LEVELS = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
} as const;

export const ANOMALY_STATUS = {
  ACTIVE: "ACTIVE",
  ACKNOWLEDGED: "ACKNOWLEDGED",
  RESOLVED: "RESOLVED",
} as const;

const anomalySchema = new mongoose.Schema({
  solarUnitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SolarUnit",
    required: true,
  },
  anomalyType: {
    type: String,
    required: true,
    enum: Object.values(ANOMALY_TYPES),
  },
  severity: {
    type: String,
    required: true,
    enum: Object.values(SEVERITY_LEVELS),
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(ANOMALY_STATUS),
    default: ANOMALY_STATUS.ACTIVE,
  },
  detectedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  affectedPeriod: {
    start: {
      type: Date,
      required: true,
    },
    end: {
      type: Date,
      required: true,
    },
  },
  description: {
    type: String,
    required: true,
  },
  recommendation: {
    type: String,
    required: true,
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  acknowledgedAt: {
    type: Date,
    default: null,
  },
  acknowledgedBy: {
    type: String,
    default: null,
  },
  resolvedAt: {
    type: Date,
    default: null,
  },
  resolvedBy: {
    type: String,
    default: null,
  },
});

// Index for efficient querying
anomalySchema.index({ solarUnitId: 1, detectedAt: -1 });
anomalySchema.index({ status: 1 });
anomalySchema.index({ anomalyType: 1 });
anomalySchema.index({ severity: 1 });

export const Anomaly = mongoose.model("Anomaly", anomalySchema);

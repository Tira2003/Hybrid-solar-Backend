import mongoose from "mongoose";

const energyGenerationRecordSchema = new mongoose.Schema({
  solarUnitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SolarUnit",
    required: true,
  },
  energyGenerated: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  intervalHours: {
    type: Number,
    default: 2,
    min: 0.1,
    max: 24,
  },
  // Weather data for anomaly detection
  cloudCoverage: {
    type: Number,
    default: 50,
    min: 0,
    max: 100,
  },
  temperature: {
    type: Number,
    default: 25,
  },
  precipitation: {
    type: Number,
    default: 0,
    min: 0,
  },
});

export const EnergyGenerationRecord = mongoose.model(
  "EnergyGenerationRecord",
  energyGenerationRecordSchema
);

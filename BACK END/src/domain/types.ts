import { Types, Document } from "mongoose";

export type Role = "admin" | "staff";

export type UserPublicMetadata = {
    role?: Role;
}

// Clerk Auth type for Express requests
export interface ClerkAuth {
    userId: string | null;
    sessionId: string | null;
    sessionClaims?: Record<string, unknown>;
    getToken: () => Promise<string | null>;
}

// Solar Unit document interface
export interface ISolarUnit extends Document {
    _id: Types.ObjectId;
    userId?: Types.ObjectId;
    serialNumber: string;
    installationDate: Date;
    capacity: number;
    status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
    latitude?: number;
    longitude?: number;
}

// Anomaly status values
export type AnomalyStatusType = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";

// Anomaly type values
export type AnomalyTypeValue = "COMPLETE_FAILURE" | "DEGRADATION" | "WEATHER_RELATED" | "SENSOR_MALFUNCTION";

// Severity level values
export type SeverityLevelType = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

// Anomaly document interface
export interface IAnomaly extends Document {
    _id: Types.ObjectId;
    solarUnitId: Types.ObjectId;
    anomalyType: AnomalyTypeValue;
    severity: SeverityLevelType;
    status: AnomalyStatusType;
    detectedAt: Date;
    affectedPeriod: {
        start: Date;
        end: Date;
    };
    description: string;
    recommendation: string;
    confidence: number;
    details: Record<string, unknown>;
    acknowledgedAt: Date | null;
    acknowledgedBy: string | null;
    resolvedAt: Date | null;
    resolvedBy: string | null;
}

// Energy Generation Record document interface
export interface IEnergyGenerationRecord extends Document {
    _id: Types.ObjectId;
    solarUnitId: Types.ObjectId;
    energyGenerated: number;
    timestamp: Date;
    intervalHours: number;
    cloudCoverage: number;
    temperature: number;
    precipitation: number;
}

// Weather API response interface
export interface OpenMeteoResponse {
    current: {
        time: string;
        temperature_2m: number;
        relative_humidity_2m: number;
        apparent_temperature: number;
        precipitation: number;
        rain: number;
        cloud_cover: number;
        weather_code: number;
        wind_speed_10m: number;
        wind_direction_10m: number;
    };
    timezone: string;
}
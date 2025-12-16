import { EnergyGenerationRecord } from "../../infrastructure/entities/EnergyGenerationRecord";
import { SolarUnit } from "../../infrastructure/entities/SolarUnit";
import { Anomaly, ANOMALY_TYPES, SEVERITY_LEVELS, ANOMALY_STATUS } from "../../infrastructure/entities/Anomaly";

interface WeatherData {
  cloudCover: number;
  temperature: number;
  precipitation: number;
  solarIrradiance?: number;
}

interface DetectionResult {
  anomalyDetected: boolean;
  anomalyType: string;
  severity: string;
  confidence: number;
  description: string;
  recommendation: string;
  details: Record<string, any>;
}

// Sunrise/sunset approximation (can be enhanced with actual API)
function getSunTimes(date: Date): { sunrise: Date; sunset: Date } {
  const d = new Date(date);
  // Default to 6 AM sunrise, 6 PM sunset (can be adjusted by location)
  const sunrise = new Date(d);
  sunrise.setHours(6, 0, 0, 0);
  const sunset = new Date(d);
  sunset.setHours(18, 0, 0, 0);
  return { sunrise, sunset };
}

function isDaytime(timestamp: Date): boolean {
  const { sunrise, sunset } = getSunTimes(timestamp);
  return timestamp >= sunrise && timestamp <= sunset;
}

/**
 * Anomaly Type 1: Complete Panel Failure Detection
 * Detects zero generation during daylight hours with good conditions
 */
export function detectCompleteFailure(
  energyGenerated: number,
  panelCapacity: number,
  timestamp: Date,
  cloudCoverage: number = 50
): DetectionResult {
  const isDay = isDaytime(timestamp);
  const generationPercent = (energyGenerated / panelCapacity) * 100;
  const zeroGeneration = generationPercent < 0.5;
  const notHeavilyClouded = cloudCoverage < 90;

  if (isDay && zeroGeneration && notHeavilyClouded) {
    return {
      anomalyDetected: true,
      anomalyType: ANOMALY_TYPES.COMPLETE_FAILURE,
      severity: SEVERITY_LEVELS.CRITICAL,
      confidence: 0.95,
      description: `Complete panel failure detected. Generation at ${generationPercent.toFixed(2)}% of capacity during daylight hours.`,
      recommendation: "Immediate inspection required. Complete system failure suspected.",
      details: {
        generationPercent,
        cloudCoverage,
        isDaytime: isDay,
      },
    };
  }

  return { anomalyDetected: false } as DetectionResult;
}

/**
 * Anomaly Type 2: Panel Degradation Detection
 * Compares current performance to historical baseline
 */
export function detectPanelDegradation(
  currentGeneration: number,
  historicalAverage: number,
  degradationThreshold: number = 15
): DetectionResult {
  if (historicalAverage <= 0) {
    return { anomalyDetected: false } as DetectionResult;
  }

  const performanceRatio = (currentGeneration / historicalAverage) * 100;
  const degradation = 100 - performanceRatio;

  if (degradation > degradationThreshold) {
    const severity = degradation > 25 ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.MEDIUM;
    const confidence = Math.min(0.85, 0.6 + (degradation * 0.01));

    return {
      anomalyDetected: true,
      anomalyType: ANOMALY_TYPES.DEGRADATION,
      severity,
      confidence,
      description: `Panel efficiency reduced by ${degradation.toFixed(1)}%. Current generation is ${performanceRatio.toFixed(1)}% of historical average.`,
      recommendation: `Panel efficiency reduced by ${degradation.toFixed(1)}%. Schedule maintenance inspection.`,
      details: {
        currentGeneration,
        historicalAverage,
        performanceRatio,
        degradationPercent: degradation,
      },
    };
  }

  return { anomalyDetected: false } as DetectionResult;
}

/**
 * Anomaly Type 3: Weather-Related Low Generation
 * Classifies low generation due to weather conditions
 */
export function classifyWeatherImpact(
  energyGenerated: number,
  expectedGeneration: number,
  cloudCoverage: number,
  precipitation: number = 0
): DetectionResult {
  // Calculate weather severity score (0-1)
  const cloudImpact = cloudCoverage / 100 * 0.7;
  const rainImpact = Math.min(0.8, precipitation * 0.2);
  const weatherSeverity = Math.min(0.9, cloudImpact + rainImpact);

  // Calculate expected reduction based on weather
  const expectedReduction = weatherSeverity * 100;
  
  // Calculate actual reduction
  const actualReduction = expectedGeneration > 0 
    ? ((expectedGeneration - energyGenerated) / expectedGeneration) * 100 
    : 0;

  // Check if reduction matches weather severity (within 20% tolerance)
  const reductionMatch = Math.abs(actualReduction - expectedReduction) < 20;

  if (weatherSeverity > 0.4 && reductionMatch) {
    return {
      anomalyDetected: true,
      anomalyType: ANOMALY_TYPES.WEATHER_RELATED,
      severity: SEVERITY_LEVELS.LOW,
      confidence: 0.8,
      description: `Low generation due to weather conditions. Cloud coverage: ${cloudCoverage}%, Precipitation: ${precipitation}mm.`,
      recommendation: "Low generation due to weather conditions. No action required.",
      details: {
        weatherSeverity,
        expectedReduction,
        actualReduction,
        cloudCoverage,
        precipitation,
        isPanelIssue: false,
      },
    };
  } else if (weatherSeverity > 0.4 && !reductionMatch && actualReduction > expectedReduction + 20) {
    // Weather is bad, but generation is even lower than expected
    return {
      anomalyDetected: true,
      anomalyType: ANOMALY_TYPES.WEATHER_RELATED,
      severity: SEVERITY_LEVELS.MEDIUM,
      confidence: 0.7,
      description: `Generation lower than expected even accounting for weather. Possible panel issue combined with adverse weather.`,
      recommendation: "Generation lower than expected even with adverse weather. Panel issue suspected.",
      details: {
        weatherSeverity,
        expectedReduction,
        actualReduction,
        cloudCoverage,
        precipitation,
        isPanelIssue: true,
      },
    };
  }

  return { anomalyDetected: false } as DetectionResult;
}

/**
 * Anomaly Type 4: Sensor Malfunction Detection
 * Detects physical impossibilities in readings
 */
export function detectSensorMalfunction(
  energyGenerated: number,
  panelCapacity: number,
  timestamp: Date,
  recentReadings: number[] = []
): DetectionResult {
  type SeverityType = typeof SEVERITY_LEVELS[keyof typeof SEVERITY_LEVELS];
  const issues: Array<{ issue: string; severity: SeverityType; confidence: number }> = [];

  // Check 1: Night-time generation
  const isDay = isDaytime(timestamp);
  if (!isDay && energyGenerated > 0.01) {
    issues.push({
      issue: "Night-time generation detected",
      severity: SEVERITY_LEVELS.CRITICAL,
      confidence: 0.98,
    });
  }

  // Check 2: Exceeds physical capacity (5% tolerance)
  if (energyGenerated > panelCapacity * 1.05) {
    issues.push({
      issue: "Generation exceeds panel capacity",
      severity: SEVERITY_LEVELS.CRITICAL,
      confidence: 0.99,
    });
  }

  // Check 3: Stuck value detection (same reading for 6+ readings)
  if (recentReadings.length >= 6) {
    const uniqueValues = new Set(recentReadings.slice(-6));
    if (uniqueValues.size === 1 && recentReadings[0] !== 0) {
      issues.push({
        issue: "Sensor reading stuck at same value",
        severity: SEVERITY_LEVELS.HIGH,
        confidence: 0.9,
      });
    }
  }

  // Check 4: Erratic fluctuations
  if (recentReadings.length >= 4) {
    const recent = recentReadings.slice(-4);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    if (mean > 0) {
      const variance = recent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recent.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = stdDev / mean;

      if (coefficientOfVariation > 1.5) {
        issues.push({
          issue: "Erratic sensor readings detected",
          severity: SEVERITY_LEVELS.MEDIUM,
          confidence: 0.75,
        });
      }
    }
  }

  // Check 5: Negative values
  if (energyGenerated < 0) {
    issues.push({
      issue: "Negative generation reading",
      severity: SEVERITY_LEVELS.CRITICAL,
      confidence: 1.0,
    });
  }

  if (issues.length > 0) {
    // Get the highest severity issue
    const severityOrder: SeverityType[] = [SEVERITY_LEVELS.LOW, SEVERITY_LEVELS.MEDIUM, SEVERITY_LEVELS.HIGH, SEVERITY_LEVELS.CRITICAL];
    const highestSeverity = issues.reduce((highest, current) => {
      return severityOrder.indexOf(current.severity) > severityOrder.indexOf(highest.severity) ? current : highest;
    });

    return {
      anomalyDetected: true,
      anomalyType: ANOMALY_TYPES.SENSOR_MALFUNCTION,
      severity: highestSeverity.severity,
      confidence: Math.max(...issues.map(i => i.confidence)),
      description: `Sensor malfunction detected: ${issues.map(i => i.issue).join(", ")}.`,
      recommendation: "Sensor malfunction detected. Calibration or replacement required.",
      details: {
        issues,
        currentReading: energyGenerated,
        panelCapacity,
        isNight: !isDay,
      },
    };
  }

  return { anomalyDetected: false } as DetectionResult;
}

/**
 * Main Anomaly Detection Runner
 * Runs all detection algorithms for a solar unit
 */
export async function runAnomalyDetection(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Starting anomaly detection...`);

  try {
    const solarUnits = await SolarUnit.find({ status: "ACTIVE" });

    for (const solarUnit of solarUnits) {
      console.log(`[Anomaly Detection] Processing solar unit: ${(solarUnit as any).serialNumber}`);

      // Get recent energy generation records (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const records = await EnergyGenerationRecord.find({
        solarUnitId: solarUnit._id,
        timestamp: { $gte: sevenDaysAgo },
      }).sort({ timestamp: -1 });

      if (records.length === 0) {
        console.log(`[Anomaly Detection] No records found for unit ${(solarUnit as any).serialNumber}`);
        continue;
      }

      // Get historical average (last 30 days for comparison)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const historicalRecords = await EnergyGenerationRecord.find({
        solarUnitId: solarUnit._id,
        timestamp: { $gte: thirtyDaysAgo, $lt: sevenDaysAgo },
      });

      const historicalAverage = historicalRecords.length > 0
        ? historicalRecords.reduce((sum, r) => sum + (r as any).energyGenerated, 0) / historicalRecords.length
        : 0;

      // Get recent readings for stuck sensor detection
      const recentReadings = records.slice(0, 10).map((r: any) => r.energyGenerated);

      // Aggregate daily totals for the last 7 days
      const dailyTotals = new Map<string, { total: number; records: any[]; avgCloud: number; avgPrecip: number }>();
      
      for (const record of records) {
        const date = new Date((record as any).timestamp).toISOString().split('T')[0];
        if (!dailyTotals.has(date)) {
          dailyTotals.set(date, { total: 0, records: [], avgCloud: 0, avgPrecip: 0 });
        }
        const dayData = dailyTotals.get(date)!;
        dayData.total += (record as any).energyGenerated;
        dayData.records.push(record);
      }

      // Calculate average weather for each day
      const dailyTotalsForWeather = Array.from(dailyTotals.entries());
      for (const [, dayData] of dailyTotalsForWeather) {
        const recordCount = dayData.records.length;
        if (recordCount > 0) {
          dayData.avgCloud = dayData.records.reduce((sum: number, r: any) => sum + ((r as any).cloudCoverage || 50), 0) / recordCount;
          dayData.avgPrecip = dayData.records.reduce((sum: number, r: any) => sum + ((r as any).precipitation || 0), 0) / recordCount;
        }
      }


      // Run detection for each day
      const dailyTotalsArray = Array.from(dailyTotals.entries());
      for (const [date, dayData] of dailyTotalsArray) {
        const panelCapacity = (solarUnit as any).capacity || 5; // Default 5kW
        const energyGenerated = dayData.total;
        const timestamp = new Date(date);

        // Use actual weather data from records
        const cloudCoverage = Math.round(dayData.avgCloud);
        const precipitation = dayData.avgPrecip;

        console.log(`[Anomaly Detection] ${date}: Energy=${energyGenerated}, Cloud=${cloudCoverage}%, Precip=${precipitation}mm`);

        // Run all detection algorithms
        const detections: DetectionResult[] = [];

        // 1. Sensor malfunction (run first - if sensor is bad, other checks unreliable)
        const sensorCheck = detectSensorMalfunction(
          energyGenerated,
          panelCapacity,
          timestamp,
          recentReadings
        );
        if (sensorCheck.anomalyDetected) {
          detections.push(sensorCheck);
          // If sensor failed, skip other checks
          await createAnomalyIfNotExists(solarUnit._id, sensorCheck, date);
          continue;
        }

        // 2. Complete failure
        const failureCheck = detectCompleteFailure(
          energyGenerated,
          panelCapacity,
          timestamp,
          cloudCoverage
        );
        if (failureCheck.anomalyDetected) {
          detections.push(failureCheck);
        }

        // 3. Weather impact (using actual weather data)
        const expectedGeneration = panelCapacity * 0.5; // Simplified expected calculation
        const weatherCheck = classifyWeatherImpact(
          energyGenerated,
          expectedGeneration,
          cloudCoverage,
          precipitation
        );
        if (weatherCheck.anomalyDetected) {
          detections.push(weatherCheck);
        }


        // 4. Degradation (only if no critical issues found)
        if (!detections.some(d => d.severity === SEVERITY_LEVELS.CRITICAL) && historicalAverage > 0) {
          const degradationCheck = detectPanelDegradation(
            energyGenerated,
            historicalAverage
          );
          if (degradationCheck.anomalyDetected) {
            detections.push(degradationCheck);
          }
        }

        // Create anomalies for each detection
        for (const detection of detections) {
          await createAnomalyIfNotExists(solarUnit._id, detection, date);
        }
      }
    }

    console.log(`[${new Date().toISOString()}] Anomaly detection completed`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Anomaly detection failed:`, error);
    throw error;
  }
}

/**
 * Create anomaly record if a similar one doesn't already exist
 */
async function createAnomalyIfNotExists(
  solarUnitId: any,
  detection: DetectionResult,
  date: string
): Promise<void> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Check if similar anomaly already exists for this day
  const existingAnomaly = await Anomaly.findOne({
    solarUnitId,
    anomalyType: detection.anomalyType,
    "affectedPeriod.start": { $gte: startOfDay, $lte: endOfDay },
  });

  if (!existingAnomaly) {
    const anomaly = new Anomaly({
      solarUnitId,
      anomalyType: detection.anomalyType,
      severity: detection.severity,
      status: ANOMALY_STATUS.ACTIVE,
      detectedAt: new Date(),
      affectedPeriod: {
        start: startOfDay,
        end: endOfDay,
      },
      description: detection.description,
      recommendation: detection.recommendation,
      confidence: detection.confidence,
      details: detection.details,
    });

    await anomaly.save();
    console.log(`[Anomaly Detection] Created new ${detection.anomalyType} anomaly for ${date}`);
  }

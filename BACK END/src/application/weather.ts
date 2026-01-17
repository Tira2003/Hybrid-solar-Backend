import { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { SolarUnit } from "../infrastructure/entities/SolarUnit";
import { User } from "../infrastructure/entities/User";
import { AppError } from "../domain/errors/errors";
import { ISolarUnit, OpenMeteoResponse } from "../domain/types";

// Simple in-memory cache to avoid rate limits
interface CacheEntry {
  data: WeatherResult;
  timestamp: number;
}

// Weather result interface
interface WeatherResult {
  current: {
    temperature: number;
    humidity: number;
    apparentTemperature: number;
    precipitation: number;
    rain: number;
    cloudCover: number;
    weatherCode: number;
    windSpeed: number;
    windDirection: number;
  };
  location: {
    latitude: number;
    longitude: number;
    timezone: string;
  };
  timestamp: Date;
}
const weatherCache: Map<string, CacheEntry> = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const getWeatherForSolarUnit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = getAuth(req);
    const { latitude, longitude } = req.query;

    // If coordinates provided as query params, use them directly
    if (latitude && longitude) {
      const lat = parseFloat(latitude as string);
      const lon = parseFloat(longitude as string);
      const weatherData = await fetchWeatherFromOpenMeteo(lat, lon);
      return res.status(200).json(weatherData);
    }

    // Require authentication for solar unit lookup
    if (!userId) {
      throw new AppError("User not authenticated", 401);
    }

    // Convert Clerk userId to MongoDB User._id
    const user = await User.findOne({ clerkUserId: userId });

    if (!user) {
      throw new AppError("User not found in database", 404);
    }

    // Get solar unit for user to extract coordinates
    const solarUnit = await SolarUnit.findOne({ userId: user._id }) as ISolarUnit | null;

    if (!solarUnit) {
      throw new AppError("Solar unit not found for user", 404);
    }

    // Get latitude and longitude from solar unit
    const lat = solarUnit.latitude;
    const lon = solarUnit.longitude;

    if (lat === null || lat === undefined || lon === null || lon === undefined) {
      throw new AppError(
        "Solar unit location (latitude/longitude) not configured. Please add location data to your solar unit.",
        400
      );
    }

    const weatherData = await fetchWeatherFromOpenMeteo(lat, lon);
    
    // Include solar unit info in response
    return res.status(200).json({
      ...weatherData,
      solarUnit: {
        id: solarUnit._id,
        serialNumber: solarUnit.serialNumber,
        capacity: solarUnit.capacity,
        location: { latitude: lat, longitude: lon },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getWeatherByCoordinates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      throw new AppError("Latitude and longitude are required", 400);
    }

    const weatherData = await fetchWeatherFromOpenMeteo(
      parseFloat(latitude as string),
      parseFloat(longitude as string)
    );

    res.status(200).json(weatherData);
  } catch (error) {
    next(error);
  }
};

async function fetchWeatherFromOpenMeteo(
  latitude: number,
  longitude: number
) {
  // Create cache key based on coordinates (rounded to 2 decimal places)
  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  
  // Check cache first
  const cached = weatherCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    console.log(`Weather cache hit for ${cacheKey}`);
    return cached.data;
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.append("latitude", latitude.toString());
  url.searchParams.append("longitude", longitude.toString());
  url.searchParams.append("current", [
    "temperature_2m",
    "relative_humidity_2m",
    "apparent_temperature",
    "precipitation",
    "rain",
    "weather_code",
    "cloud_cover",
    "wind_speed_10m",
    "wind_speed_80m",
    "wind_speed_120m",
    "wind_speed_180m",
    "wind_direction_10m",
  ].join(","));
  url.searchParams.append("timezone", "auto");

  const response = await fetch(url.toString());

  if (!response.ok) {
    // If rate limited, try to return stale cache if available
    if (response.status === 429 && cached) {
      console.log(`Rate limited, returning stale cache for ${cacheKey}`);
      return cached.data;
    }
    throw new Error(`Weather API error: ${response.statusText}`);
  }

  const data = await response.json() as OpenMeteoResponse;

  // Transform the raw data into a more usable format
  const result = {
    current: {
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      apparentTemperature: data.current.apparent_temperature,
      precipitation: data.current.precipitation,
      rain: data.current.rain,
      cloudCover: data.current.cloud_cover,
      weatherCode: data.current.weather_code,
      windSpeed: data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m,
    },
    location: {
      latitude,
      longitude,
      timezone: data.timezone,
    },
    timestamp: new Date(data.current.time),
  };

  // Store in cache
  weatherCache.set(cacheKey, { data: result, timestamp: Date.now() });
  console.log(`Weather cached for ${cacheKey}`);

  return result;
}

export function getSolarImpact(cloudCover: number, weatherCode: number): {
  impact: "excellent" | "good" | "fair" | "poor";
  description: string;
  efficiency: number;
} {
  if (weatherCode >= 80) {
    return {
      impact: "poor",
      description: "Heavy rain/thunderstorm - minimal solar generation",
      efficiency: 10,
    };
  }

  if (weatherCode >= 50) {
    return {
      impact: "fair",
      description: "Rainy conditions - reduced solar generation",
      efficiency: 30,
    };
  }

  if (weatherCode >= 45) {
    return {
      impact: "fair",
      description: "Foggy conditions - reduced solar generation",
      efficiency: 25,
    };
  }

  if (cloudCover >= 80) {
    return {
      impact: "fair",
      description: "Heavily cloudy - reduced solar generation",
      efficiency: 35,
    };
  }

  if (cloudCover >= 50) {
    return {
      impact: "good",
      description: "Partly cloudy - good solar generation",
      efficiency: 65,
    };
  }

  if (cloudCover >= 20) {
    return {
      impact: "good",
      description: "Mostly clear - good solar generation",
      efficiency: 85,
    };
  }

  return {
    impact: "excellent",
    description: "Clear skies - excellent solar generation",
    efficiency: 95,
  };
}

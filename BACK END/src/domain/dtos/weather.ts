import { z } from "zod";

export const WeatherCoordinatesDto = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const WeatherQueryDto = z.object({
  latitude: z.string().transform(Number).optional(),
  longitude: z.string().transform(Number).optional(),
});

import express from "express";
import { getWeatherForSolarUnit, getWeatherByCoordinates } from "../application/weather";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";

const weatherRouter = express.Router();

// Get weather for authenticated user's solar unit
weatherRouter.route("/solar-unit").get(authenticationMiddleware, getWeatherForSolarUnit);

// Get weather by coordinates (public endpoint)
weatherRouter.route("/coordinates").get(getWeatherByCoordinates);

export default weatherRouter;

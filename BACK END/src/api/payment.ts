import express from "express";
import { createCheckoutSession, getSessionStatus } from "../application/payment";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";

const router = express.Router();

router.post("/create-checkout-session", authenticationMiddleware, createCheckoutSession);
router.get("/session-status", authenticationMiddleware, getSessionStatus);

export default router;

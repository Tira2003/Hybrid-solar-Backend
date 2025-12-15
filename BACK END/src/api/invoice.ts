import express from "express";
import {
  getInvoicesForUser,
  getInvoiceById,
  getAllInvoices,
} from "../application/invoice";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";
import { authorizationMiddleware } from "./middlewares/authorization-middleware";

const invoiceRouter = express.Router();

// User routes
invoiceRouter
  .route("/")
  .get(authenticationMiddleware, getInvoicesForUser);

invoiceRouter
  .route("/:id")
  .get(authenticationMiddleware, getInvoiceById);

// Admin routes
invoiceRouter
  .route("/admin/all")
  .get(authenticationMiddleware, authorizationMiddleware, getAllInvoices);

export default invoiceRouter;

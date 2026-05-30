
import { Router } from "express";
import v1Routes from "../v1/routes.js";
import * as currencyController from "./currency.controller.js";
import authRoutes from "./routes/auth.routes.js"; // Added import for auth routes
import adminRoutes from "./admin/routes.js";

import { protect } from "../../middleware/authMiddleware.js";

const router = Router();

// Inherit all v1 routes (Auth, Transactions, Categories)
router.use(v1Routes);

// v1.1 Auth Routes
router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);

// v1.1 Specific Routes (Currency)
router.get("/currencies", protect, currencyController.listCurrencies);
router.put("/users/currency", protect, currencyController.updateUserCurrency);



export default router;

import { Router } from "express";
import * as authController from "./auth.controller.js";
import * as categoryController from "./category.controller.js";
import * as transactionController from "./transaction.controller.js";
import { protect } from "../../middleware/authMiddleware.js";
import { authLimiter } from "../../middleware/rateLimiter.js";

const router = Router();

// Auth Routes
router.post("/auth/register", authLimiter, authController.register);
router.post("/auth/login", authLimiter, authController.login);
router.get("/auth/session", authController.getSession);
router.post("/auth/refresh", authController.refreshSession);
router.post("/auth/logout", authController.logout);
router.get("/auth/me", protect, authController.getProfile);

// Category Routes
const categoryRouter = Router();
categoryRouter.use(protect);
categoryRouter.get("/active", categoryController.listActiveCategories);
categoryRouter.get("/all", categoryController.listAllCategories);
categoryRouter.post("/", categoryController.createCategory);
categoryRouter.patch("/:id", categoryController.setDefaultCategory);
categoryRouter.delete("/:id", categoryController.archiveCategory);

router.use("/categories", categoryRouter);

// Transaction Routes
const transactionRouter = Router();
transactionRouter.use(protect);
transactionRouter.post("/", transactionController.createTransaction);
transactionRouter.post("/custom", transactionController.createTransactionWithCustomDate);
transactionRouter.get("/", transactionController.getTransactions);
transactionRouter.get("/summary", transactionController.getSummary);
transactionRouter.put("/:id", transactionController.updateTransaction);
transactionRouter.delete("/:id", transactionController.deleteTransaction);

router.use("/transactions", transactionRouter);

export default router;

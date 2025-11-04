import { Router } from "express";
import {
  createTransaction,
  getTransactions,
  getSummary,
  updateTransaction,
  deleteTransaction,
} from "../controllers/transactionController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);

router.post("/", createTransaction);
router.get("/", getTransactions);
router.get("/summary", getSummary);
router.put("/:id", updateTransaction);
router.delete("/:id", deleteTransaction);

export default router;

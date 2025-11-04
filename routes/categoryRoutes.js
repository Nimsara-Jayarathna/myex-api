import { Router } from "express";
import {
  listCategories,
  createCategory,
  archiveCategory,
} from "../controllers/categoryController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);

router.get("/", listCategories);
router.post("/", createCategory);
router.delete("/:id", archiveCategory);

export default router;

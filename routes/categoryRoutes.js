import { Router } from "express";
import {
  listCategories,
  createCategory,
  setDefaultCategory,
  archiveCategory,
} from "../controllers/categoryController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.use(protect);

router.get("/", listCategories);
router.post("/", createCategory);
router.patch("/:id", setDefaultCategory);
router.delete("/:id", archiveCategory);

export default router;

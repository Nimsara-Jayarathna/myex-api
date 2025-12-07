import { Router } from "express";
import {
  getProfile,
  getSession,
  login,
  logout,
  refreshSession,
  register,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/session", getSession);
router.post("/refresh", refreshSession);
router.post("/logout", logout);
router.get("/me", protect, getProfile);

export default router;

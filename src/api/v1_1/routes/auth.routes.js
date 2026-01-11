
import { Router } from "express";
import * as authController from "../auth.controller.js";
import { protect } from "../../../middleware/authMiddleware.js";
import { authLimiter } from "../../../middleware/rateLimiter.js";

const router = Router();

// Registration Flow
router.post("/register/init", authLimiter, authController.registerInit);
router.post("/register/verify", authLimiter, authController.registerVerify);
router.post("/register/complete", authLimiter, authController.registerComplete);

// Password Management
router.post("/password/forgot", authLimiter, authController.forgotPassword);
router.post("/password/reset", authLimiter, authController.resetPassword);
router.post("/password/change", protect, authController.changePassword);

// Email Change Flow
router.post("/email/change/init", protect, authController.changeEmailInit);
router.post("/email/change/verify-current", protect, authController.changeEmailVerifyCurrent);
router.post("/email/change/request-new", protect, authController.requestNewEmail);
router.post("/email/change/confirm", protect, authController.confirmNewEmail);

// User Profile
router.put("/me", protect, authController.updateUserDetails);

export default router;

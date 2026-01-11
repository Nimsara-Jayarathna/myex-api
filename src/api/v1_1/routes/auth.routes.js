
import { Router } from "express";
import * as authController from "../auth.controller.js";
import { protect } from "../../../middleware/authMiddleware.js";
import { authLimiter, emailLimiter } from "../../../middleware/rateLimiter.js";

const router = Router();

// Registration Flow
router.post("/register/init", emailLimiter, authController.registerInit);
router.post("/register/verify", authLimiter, authController.registerVerify);
router.post("/register/complete", authLimiter, authController.registerComplete);

// Password Management
router.post("/password/forgot", emailLimiter, authController.forgotPassword);
router.post("/password/reset", authLimiter, authController.resetPassword);
router.post("/password/change", protect, emailLimiter, authController.changePassword);

// Email Change Flow
router.post("/email/change/init", protect, emailLimiter, authController.changeEmailInit);
router.post("/email/change/verify-current", protect, authController.changeEmailVerifyCurrent);
router.post("/email/change/request-new", protect, emailLimiter, authController.requestNewEmail);
router.post("/email/change/confirm", protect, authController.confirmNewEmail);

// User Profile
router.put("/me", protect, authController.updateUserDetails);

export default router;

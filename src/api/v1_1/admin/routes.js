import { Router } from "express";
import * as adminController from "./admin.controller.js";
import { attachAdminRequestMeta } from "./utils/adminResponse.js";
import { authLimiter, emailLimiter } from "../../../middleware/rateLimiter.js";
import { requireAdminAuth } from "./middleware/adminAuth.middleware.js";

const router = Router();

router.use(attachAdminRequestMeta);

router.post("/auth/login", authLimiter, adminController.login);
router.post("/auth/otp/verify", authLimiter, adminController.verifyOtp);
router.post("/auth/otp/resend", emailLimiter, adminController.resendOtp);
router.get("/auth/otp/status", adminController.otpStatus);
router.post("/auth/otp/cancel", adminController.cancelOtp);
router.get("/auth/session", adminController.session);
router.post("/auth/logout", adminController.logout);
router.get("/dashboard", requireAdminAuth, adminController.dashboard);
router.get("/users", requireAdminAuth, adminController.users);
router.get("/users/:id", requireAdminAuth, adminController.userById);
router.patch("/users/:id", requireAdminAuth, adminController.updateUser);
router.post("/users/:id/reset-password", requireAdminAuth, adminController.resetUserPassword);
router.post("/users/:id/force-logout", requireAdminAuth, adminController.forceLogoutUser);
router.get("/users/:id/activity", requireAdminAuth, adminController.userActivity);
router.get("/currencies", requireAdminAuth, adminController.currencies);
router.get("/currencies/:id", requireAdminAuth, adminController.currencyById);
router.post("/currencies", requireAdminAuth, adminController.createCurrency);
router.patch("/currencies/:id", requireAdminAuth, adminController.updateCurrency);
router.post("/currencies/:id/set-default", requireAdminAuth, adminController.setCurrencyDefault);
router.post("/currencies/:id/toggle-status", requireAdminAuth, adminController.toggleCurrencyStatus);
router.get("/categories", requireAdminAuth, adminController.categories);
router.post("/categories", requireAdminAuth, adminController.createCategory);
router.patch("/categories/:id", requireAdminAuth, adminController.updateCategory);
router.post("/categories/:id/set-default", requireAdminAuth, adminController.setCategoryDefault);
router.delete("/categories/:id", requireAdminAuth, adminController.deleteCategory);
router.patch("/categories/settings", requireAdminAuth, adminController.updateCategorySettings);
router.get("/system", requireAdminAuth, adminController.systemSnapshot);
router.get("/system/provider-usage", requireAdminAuth, adminController.providerUsageHistory);
router.post("/system/backup/run", requireAdminAuth, adminController.runBackup);
router.get("/system/backup/:id", requireAdminAuth, adminController.backupById);
router.get("/system/backup/:id/download", requireAdminAuth, adminController.downloadBackup);
router.post("/system/backup/:id/cancel", requireAdminAuth, adminController.cancelBackup);
router.get("/system/delete-requests", requireAdminAuth, adminController.deleteRequests);
router.post("/system/delete-requests", requireAdminAuth, adminController.createDeleteRequest);
router.post("/system/delete-requests/:id/decision", requireAdminAuth, adminController.decideDeleteRequest);

export default router;

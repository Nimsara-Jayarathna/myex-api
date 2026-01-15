
import { asyncHandler } from "../../utils/errorHandler.js";
import { setAuthCookies } from "../../utils/authTokens.js";
import * as authService from "./services/auth.service.js";
import { sendSuccess } from "../../utils/responseHelper.js";
import { HTTP_STATUS } from "../../utils/errorCodes.js";

const respondWithAuth = (res, user, tokens, statusCode = HTTP_STATUS.OK) => {
    setAuthCookies(res, tokens);
    return sendSuccess(res, { user: authService.sanitizeUser(user) }, "Authentication successful", statusCode);
};

export const updateUserDetails = asyncHandler(async (req, res) => {
    const result = await authService.updateUserDetails(req.user._id, req.body.fname, req.body.lname);
    sendSuccess(res, result, "User details updated");
});

// --- Registration Endpoints ---

export const registerInit = asyncHandler(async (req, res) => {
    const result = await authService.initiateRegistration(req.body.email);
    sendSuccess(res, result, "Registration initiated");
});

export const registerVerify = asyncHandler(async (req, res) => {
    const result = await authService.verifyRegistrationOtp(req.body.email, req.body.otp);
    sendSuccess(res, result, "OTP verified");
});

export const registerComplete = asyncHandler(async (req, res) => {
    const { user, tokens } = await authService.completeRegistration(req.body);
    respondWithAuth(res, user, tokens, HTTP_STATUS.CREATED);
});

// --- Password Management ---

export const forgotPassword = asyncHandler(async (req, res) => {
    const result = await authService.requestPasswordReset(req.body.email, req.body.platform);
    sendSuccess(res, result, "Password reset email sent");
});

export const resetPassword = asyncHandler(async (req, res) => {
    const result = await authService.resetPassword(req.body.token, req.body.password);
    sendSuccess(res, result, "Password reset successfully");
});

export const changePassword = asyncHandler(async (req, res) => {
    const result = await authService.changePassword(req.user._id, req.body.currentPassword, req.body.newPassword);
    sendSuccess(res, result, "Password changed successfully");
});

// --- Email Change ---

export const changeEmailInit = asyncHandler(async (req, res) => {
    const result = await authService.initiateChangeEmail(req.user._id);
    sendSuccess(res, result, "Email change initiated");
});

export const changeEmailVerifyCurrent = asyncHandler(async (req, res) => {
    const result = await authService.verifyCurrentEmail(req.user._id, req.body.otp);
    sendSuccess(res, result, "Current email verified");
});

export const requestNewEmail = asyncHandler(async (req, res) => {
    const result = await authService.requestNewEmail(req.user._id, req.body.changeToken, req.body.newEmail);
    sendSuccess(res, result, "Verification email sent to new address");
});

export const confirmNewEmail = asyncHandler(async (req, res) => {
    const result = await authService.confirmNewEmail(req.user._id, req.body.otp);
    sendSuccess(res, result, "Email changed successfully");
});

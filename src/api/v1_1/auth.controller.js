
import { asyncHandler } from "../../utils/errorHandler.js";
import { setAuthCookies } from "../../utils/authTokens.js";
import * as authService from "./services/auth.service.js";

const respondWithAuth = (res, user, tokens) => {
    setAuthCookies(res, tokens);
    return res.json({
        user: authService.sanitizeUser(user),
    });
};

// --- Registration Endpoints ---

export const registerInit = asyncHandler(async (req, res) => {
    const result = await authService.initiateRegistration(req.body.email);
    res.status(200).json(result);
});

export const registerVerify = asyncHandler(async (req, res) => {
    const result = await authService.verifyRegistrationOtp(req.body.email, req.body.otp);
    res.status(200).json(result);
});

export const registerComplete = asyncHandler(async (req, res) => {
    const { user, tokens } = await authService.completeRegistration(req.body);
    res.status(201);
    respondWithAuth(res, user, tokens);
});

// --- Password Management ---

export const forgotPassword = asyncHandler(async (req, res) => {
    const result = await authService.requestPasswordReset(req.body.email);
    res.status(200).json(result);
});

export const resetPassword = asyncHandler(async (req, res) => {
    const result = await authService.resetPassword(req.body.token, req.body.password);
    res.status(200).json(result);
});

// --- Email Change ---

export const changeEmailInit = asyncHandler(async (req, res) => {
    const result = await authService.initiateChangeEmail(req.user._id);
    res.status(200).json(result);
});

export const changeEmailVerifyCurrent = asyncHandler(async (req, res) => {
    const result = await authService.verifyCurrentEmail(req.user._id, req.body.otp);
    res.status(200).json(result);
});

export const requestNewEmail = asyncHandler(async (req, res) => {
    const result = await authService.requestNewEmail(req.user._id, req.body.changeToken, req.body.newEmail);
    res.status(200).json(result);
});

export const confirmNewEmail = asyncHandler(async (req, res) => {
    const result = await authService.confirmNewEmail(req.user._id, req.body.otp);
    res.status(200).json(result);
});

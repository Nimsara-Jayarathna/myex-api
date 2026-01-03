import { asyncHandler } from "../../utils/errorHandler.js";
import {
  clearAuthCookies,
  setAuthCookies,
} from "../../utils/authTokens.js";
import { getClientIp, getDeviceInfo, hashEmail, logger } from "../../utils/logger.js";
import * as authService from "./services/auth.service.js";

const handleTokenError = (err, messageExpired, messageInvalid) => {
  if (err.name === "TokenExpiredError") {
    const error = new Error(messageExpired);
    error.status = 419;
    throw error;
  }

  const error = new Error(messageInvalid);
  error.status = err.status || 401;
  throw error;
};

const respondWithAuth = (res, user, tokens) => {
  setAuthCookies(res, tokens);
  return res.json({
    user: authService.sanitizeUser(user),
  });
};

export const register = asyncHandler(async (req, res) => {
  const { user, tokens } = await authService.registerUser(req.body);

  res.status(201);
  respondWithAuth(res, user, tokens);
});

export const login = asyncHandler(async (req, res) => {
  const start = process.hrtime.bigint();
  const { email } = req.body || {};
  const emailHash = hashEmail(email);
  const clientIp = getClientIp(req);
  const deviceInfo = getDeviceInfo(req);
  const userAgent = req.get("user-agent") || undefined;
  const requestPath = `${req.baseUrl || ""}${req.path}`;
  res.locals.userEmailHash = emailHash;

  try {
    const { user, tokens } = await authService.loginUser(req.body);

    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info({
      method: req.method,
      path: requestPath,
      status: 200,
      durationMs: Number(durationMs.toFixed(1)),
      clientIp,
      userEmailHash: emailHash,
      deviceType: deviceInfo.deviceType,
      deviceModel: deviceInfo.deviceModel,
      os: deviceInfo.os,
      browser: deviceInfo.browser,
      appVersion: deviceInfo.appVersion,
      userAgent,
      loginSuccess: true,
    });

    respondWithAuth(res, user, tokens);
  } catch (error) {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    logger.warn({
      method: req.method,
      path: requestPath,
      status: error.status || 500,
      durationMs: Number(durationMs.toFixed(1)),
      clientIp,
      userEmailHash: emailHash,
      deviceType: deviceInfo.deviceType,
      deviceModel: deviceInfo.deviceModel,
      os: deviceInfo.os,
      browser: deviceInfo.browser,
      appVersion: deviceInfo.appVersion,
      userAgent,
      errorMessage: error.message,
      loginSuccess: false,
    });
    throw error;
  }
});

export const getProfile = asyncHandler(async (req, res) => {
  res.json({ user: authService.sanitizeUser(req.user) });
});

export const getSession = asyncHandler(async (req, res) => {
  try {
    const user = await authService.getUserSession(req.cookies?.accessToken);
    res.json({ user: authService.sanitizeUser(user) });
  } catch (err) {
    handleTokenError(err, "Access token expired", "Invalid access token");
  }
});

export const refreshSession = asyncHandler(async (req, res) => {
  try {
    const { user, tokens } = await authService.refreshUserSession(req.cookies?.refreshToken);
    respondWithAuth(res, user, tokens);
  } catch (err) {
    clearAuthCookies(res);
    handleTokenError(err, "Refresh token expired", "Invalid refresh token");
  }
});

export const logout = asyncHandler(async (req, res) => {
  clearAuthCookies(res);
  res.status(204).send();
});

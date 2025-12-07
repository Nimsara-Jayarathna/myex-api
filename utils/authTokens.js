import dotenv from "dotenv";
import jwt from "jsonwebtoken";

// Load environment variables early for token secrets
dotenv.config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

const DEFAULT_ACCESS_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const parseDurationMs = (value, fallbackMs) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return fallbackMs;
  }

  const match = value.trim().match(/^(\d+)([smhd])$/i);
  if (!match) {
    return fallbackMs;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  return amount * multipliers[unit] || fallbackMs;
};

const accessTokenMaxAgeMs = parseDurationMs(ACCESS_TOKEN_EXPIRES_IN, DEFAULT_ACCESS_MAX_AGE_MS);
const refreshTokenMaxAgeMs = parseDurationMs(REFRESH_TOKEN_EXPIRES_IN, DEFAULT_REFRESH_MAX_AGE_MS);

const sameSiteEnv = (process.env.COOKIE_SAMESITE || "lax").toLowerCase();
const cookieSameSite = sameSiteEnv === "none" ? "none" : "lax";
const cookieSecure = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE !== "false" : true;
const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

const baseCookieOptions = {
  httpOnly: true,
  secure: cookieSecure,
  sameSite: cookieSameSite,
  domain: cookieDomain,
  path: "/",
};

const ensureTokenSecrets = () => {
  if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
    const error = new Error("JWT secrets are not configured");
    error.status = 500;
    throw error;
  }
};

const signToken = (userId, secret, expiresIn, tokenType) => {
  ensureTokenSecrets();
  return jwt.sign({ userId, tokenType }, secret, { expiresIn });
};

export const generateAccessToken = (userId) =>
  signToken(userId, ACCESS_TOKEN_SECRET, ACCESS_TOKEN_EXPIRES_IN, "access");

export const generateRefreshToken = (userId) =>
  signToken(userId, REFRESH_TOKEN_SECRET, REFRESH_TOKEN_EXPIRES_IN, "refresh");

export const verifyAccessToken = (token) => {
  ensureTokenSecrets();
  const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
  if (decoded.tokenType && decoded.tokenType !== "access") {
    const error = new Error("Invalid token type");
    error.status = 401;
    throw error;
  }
  return decoded;
};

export const verifyRefreshToken = (token) => {
  ensureTokenSecrets();
  const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);
  if (decoded.tokenType && decoded.tokenType !== "refresh") {
    const error = new Error("Invalid token type");
    error.status = 401;
    throw error;
  }
  return decoded;
};

export const setAuthCookies = (res, { accessToken, refreshToken }) => {
  res.cookie("accessToken", accessToken, { ...baseCookieOptions, maxAge: accessTokenMaxAgeMs });
  res.cookie("refreshToken", refreshToken, { ...baseCookieOptions, maxAge: refreshTokenMaxAgeMs });
};

export const clearAuthCookies = (res) => {
  res.clearCookie("accessToken", baseCookieOptions);
  res.clearCookie("refreshToken", baseCookieOptions);
};

export const issueTokens = (userId) => ({
  accessToken: generateAccessToken(userId),
  refreshToken: generateRefreshToken(userId),
});

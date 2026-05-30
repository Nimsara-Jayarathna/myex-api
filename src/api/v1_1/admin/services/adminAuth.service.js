import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import AdminUser from "../../../../models/AdminUser.js";
import AdminOtpChallenge from "../../../../models/AdminOtpChallenge.js";
import { sendAdminOtpEmail } from "../../services/email.service.js";
import { hashEmail, logger, maskEmail } from "../../../../utils/logger.js";

const ADMIN_COOKIE_NAME = "adminAccessToken";
const ADMIN_OTP_COOKIE_NAME = "adminOtpChallenge";
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;

const ADMIN_OTP_EXPIRES_IN = process.env.ADMIN_OTP_EXPIRES_IN || "5m";
const ADMIN_OTP_MAX_ATTEMPTS = Number(process.env.ADMIN_OTP_MAX_ATTEMPTS) || 3;
const ADMIN_OTP_RESEND_COOLDOWN_SECONDS =
  Number(process.env.ADMIN_OTP_RESEND_COOLDOWN_SECONDS) || 45;
const ADMIN_OTP_LOCK_MINUTES = Number(process.env.ADMIN_OTP_LOCK_MINUTES) || 15;

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

const sanitizeAdmin = (admin) => ({
  id: admin._id.toString(),
  email: admin.email,
  roles: admin.roles?.length ? admin.roles : ["super_admin"],
});

const normalizeEmail = (email) => email.toLowerCase().trim();

const getCookieBaseOptions = () => {
  const sameSiteEnv = (process.env.COOKIE_SAMESITE || "lax").toLowerCase();
  const cookieSameSite = sameSiteEnv === "none" ? "none" : "lax";
  const cookieSecure = process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE !== "false"
    : true;
  const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

  return {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    domain: cookieDomain,
    path: "/",
  };
};

const getAdminCookieOptions = () => ({
  ...getCookieBaseOptions(),
  maxAge: parseDurationMs(ACCESS_TOKEN_EXPIRES_IN, 15 * 60 * 1000),
});

const getAdminOtpCookieOptions = () => ({
  ...getCookieBaseOptions(),
  maxAge: parseDurationMs(ADMIN_OTP_EXPIRES_IN, 5 * 60 * 1000) + 60_000,
});

const hashToken = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const generateChallengeToken = () => crypto.randomBytes(32).toString("hex");

const getOtpTtlMs = () => parseDurationMs(ADMIN_OTP_EXPIRES_IN, 5 * 60 * 1000);

const getOtpStatusPayload = (challenge) => {
  const now = Date.now();
  const expiresInMs = Math.max(0, challenge.expiresAt.getTime() - now);
  const remainingAttempts = Math.max(0, challenge.maxAttempts - challenge.attemptCount);
  const lockoutRemainingMs = challenge.lockedUntil
    ? Math.max(0, challenge.lockedUntil.getTime() - now)
    : 0;
  const resendAvailableInMs = challenge.resendAvailableAt
    ? Math.max(0, challenge.resendAvailableAt.getTime() - now)
    : 0;

  return {
    challengeId: challenge._id.toString(),
    maskedEmail: maskEmail(challenge.email),
    otpExpiresInSeconds: Math.ceil(expiresInMs / 1000),
    remainingAttempts,
    maxAttempts: challenge.maxAttempts,
    lockoutRemainingSeconds: Math.ceil(lockoutRemainingMs / 1000),
    resendAvailableInSeconds: Math.ceil(resendAvailableInMs / 1000),
    status: challenge.status,
  };
};

const getAdminOtpTokenFromRequest = (req) => req.cookies?.[ADMIN_OTP_COOKIE_NAME];

const setAdminOtpCookie = (res, challengeToken) => {
  res.cookie(ADMIN_OTP_COOKIE_NAME, challengeToken, getAdminOtpCookieOptions());
};

const clearAdminOtpCookie = (res) => {
  const options = getAdminOtpCookieOptions();
  delete options.maxAge;
  res.clearCookie(ADMIN_OTP_COOKIE_NAME, options);
};

const findActiveChallengeByToken = async (challengeToken) => {
  if (!challengeToken) {
    return null;
  }

  const challengeTokenHash = hashToken(challengeToken);
  return AdminOtpChallenge.findOne({ challengeTokenHash });
};

const markChallengeInvalid = async (challenge, status = "expired") => {
  if (!challenge) {
    return;
  }

  challenge.status = status;
  challenge.invalidatedAt = new Date();
  await challenge.save();
};

const ensureChallengeState = async (challenge) => {
  const now = new Date();

  if (!challenge) {
    const error = new Error("OTP challenge not found. Please login again.");
    error.status = 401;
    throw error;
  }

  if (challenge.usedAt || challenge.status === "consumed" || challenge.status === "cancelled") {
    const error = new Error("OTP challenge is no longer valid. Please login again.");
    error.status = 401;
    throw error;
  }

  if (challenge.expiresAt.getTime() <= now.getTime()) {
    await markChallengeInvalid(challenge, "expired");
    const error = new Error("OTP expired. Please login again.");
    error.status = 401;
    throw error;
  }

  if (challenge.lockedUntil && challenge.lockedUntil.getTime() > now.getTime()) {
    challenge.status = "locked";
    await challenge.save();

    const error = new Error("Maximum attempts reached. Access is temporarily blocked.");
    error.status = 423;
    error.details = {
      lockoutRemainingSeconds: [
        String(Math.ceil((challenge.lockedUntil.getTime() - now.getTime()) / 1000)),
      ],
    };
    error.otpStatus = statusSnapshot;
    throw error;
  }
};

export const authenticateAdmin = async ({ email, password }) => {
  if (!email || !password) {
    const error = new Error("Email and password are required.");
    error.status = 400;
    error.details = {
      email: !email ? ["Email is required."] : undefined,
      password: !password ? ["Password is required."] : undefined,
    };
    throw error;
  }

  const normalizedEmail = normalizeEmail(email);
  const admin = await AdminUser.findOne({ email: normalizedEmail }).select(
    "+passwordHash email roles isActive"
  );
  if (!admin || !admin.isActive) {
    const error = new Error("Incorrect email or password.");
    error.status = 401;
    throw error;
  }

  const validPassword = await bcrypt.compare(password, admin.passwordHash);
  if (!validPassword) {
    const error = new Error("Incorrect email or password.");
    error.status = 401;
    throw error;
  }

  return sanitizeAdmin(admin);
};

export const startAdminOtpChallenge = async (admin, requestMeta = {}) => {
  const now = new Date();
  const challengeToken = generateChallengeToken();
  const challengeTokenHash = hashToken(challengeToken);
  const otp = generateOtp();
  const otpHash = hashToken(otp);
  const expiresAt = new Date(now.getTime() + getOtpTtlMs());
  const resendAvailableAt = new Date(
    now.getTime() + ADMIN_OTP_RESEND_COOLDOWN_SECONDS * 1000
  );

  await AdminOtpChallenge.updateMany(
    {
      adminId: admin.id,
      status: { $in: ["pending", "locked"] },
      usedAt: null,
    },
    {
      $set: {
        status: "cancelled",
        invalidatedAt: now,
      },
    }
  );

  const challenge = await AdminOtpChallenge.create({
    adminId: admin.id,
    email: admin.email,
    challengeTokenHash,
    otpHash,
    status: "pending",
    attemptCount: 0,
    maxAttempts: ADMIN_OTP_MAX_ATTEMPTS,
    resendCount: 0,
    resendAvailableAt,
    expiresAt,
  });

  await sendAdminOtpEmail(admin.email, otp);

  logger.info({
    event: "admin_otp_issued",
    adminEmailHash: hashEmail(admin.email),
    adminId: admin.id,
    ip: requestMeta.ip,
    userAgent: requestMeta.userAgent,
    challengeId: challenge._id.toString(),
  });

  return {
    challengeToken,
    status: getOtpStatusPayload(challenge),
  };
};

export const getAdminOtpChallengeStatus = async (req) => {
  const challengeToken = getAdminOtpTokenFromRequest(req);
  const challenge = await findActiveChallengeByToken(challengeToken);

  await ensureChallengeState(challenge);

  return {
    otpRequired: true,
    ...getOtpStatusPayload(challenge),
  };
};

export const verifyAdminOtpChallenge = async ({ req, otp, requestMeta = {} }) => {
  if (!otp || !String(otp).trim()) {
    const error = new Error("OTP is required.");
    error.status = 400;
    error.details = { otp: ["OTP is required."] };
    throw error;
  }

  const normalizedOtp = String(otp).trim();
  if (!/^\d{6}$/.test(normalizedOtp)) {
    const error = new Error("OTP must be a 6-digit code.");
    error.status = 400;
    error.details = { otp: ["OTP must be a 6-digit code."] };
    throw error;
  }

  const challengeToken = getAdminOtpTokenFromRequest(req);
  const challenge = await findActiveChallengeByToken(challengeToken);

  await ensureChallengeState(challenge);

  const otpHash = hashToken(normalizedOtp);
  if (otpHash !== challenge.otpHash) {
    challenge.attemptCount += 1;

    const now = new Date();
    const reachedLimit = challenge.attemptCount >= challenge.maxAttempts;
    if (reachedLimit) {
      challenge.status = "locked";
      challenge.lockedUntil = new Date(now.getTime() + ADMIN_OTP_LOCK_MINUTES * 60 * 1000);
    }

    await challenge.save();

    logger.warn({
      event: "admin_otp_attempt_failed",
      adminEmailHash: hashEmail(challenge.email),
      adminId: challenge.adminId.toString(),
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent,
      challengeId: challenge._id.toString(),
      attemptsUsed: challenge.attemptCount,
      maxAttempts: challenge.maxAttempts,
      locked: reachedLimit,
    });

    const error = new Error(
      reachedLimit
        ? "Maximum OTP attempts reached. Access is temporarily blocked."
        : "Incorrect verification code. Please try again."
    );
    error.status = reachedLimit ? 423 : 401;
    const statusSnapshot = getOtpStatusPayload(challenge);
    error.details = {
      remainingAttempts: [String(statusSnapshot.remainingAttempts)],
      maxAttempts: [String(statusSnapshot.maxAttempts)],
      lockoutRemainingSeconds: [String(statusSnapshot.lockoutRemainingSeconds)],
      otpStatus: [JSON.stringify(statusSnapshot)],
    };
    error.otpStatus = getOtpStatusPayload(challenge);
    throw error;
  }

  const admin = await getActiveAdminById(challenge.adminId);

  await AdminUser.updateOne(
    { _id: admin.id },
    { $set: { lastLoginAt: new Date() } }
  );

  challenge.status = "consumed";
  challenge.usedAt = new Date();
  challenge.invalidatedAt = new Date();
  await challenge.save();

  logger.info({
    event: "admin_otp_verified",
    adminEmailHash: hashEmail(admin.email),
    adminId: admin.id,
    ip: requestMeta.ip,
    userAgent: requestMeta.userAgent,
    challengeId: challenge._id.toString(),
  });

  return {
    admin,
    session: { accessTokenExpiresInSeconds: getAccessTokenTtlSeconds() },
  };
};

export const resendAdminOtpChallenge = async ({ req, requestMeta = {} }) => {
  const challengeToken = getAdminOtpTokenFromRequest(req);
  const challenge = await findActiveChallengeByToken(challengeToken);

  await ensureChallengeState(challenge);

  const now = new Date();
  if (challenge.resendAvailableAt && challenge.resendAvailableAt.getTime() > now.getTime()) {
    const waitSeconds = Math.ceil(
      (challenge.resendAvailableAt.getTime() - now.getTime()) / 1000
    );
    const error = new Error("Please wait before requesting another code.");
    error.status = 429;
    error.details = { resendAvailableInSeconds: [String(waitSeconds)] };
    error.otpStatus = getOtpStatusPayload(challenge);
    throw error;
  }

  const otp = generateOtp();
  challenge.otpHash = hashToken(otp);
  challenge.expiresAt = new Date(now.getTime() + getOtpTtlMs());
  challenge.resendCount += 1;
  challenge.resendAvailableAt = new Date(
    now.getTime() + ADMIN_OTP_RESEND_COOLDOWN_SECONDS * 1000
  );
  challenge.status = "pending";

  await challenge.save();
  await sendAdminOtpEmail(challenge.email, otp);

  logger.info({
    event: "admin_otp_resent",
    adminEmailHash: hashEmail(challenge.email),
    adminId: challenge.adminId.toString(),
    ip: requestMeta.ip,
    userAgent: requestMeta.userAgent,
    challengeId: challenge._id.toString(),
    resendCount: challenge.resendCount,
  });

  return {
    otpRequired: true,
    ...getOtpStatusPayload(challenge),
  };
};

export const cancelAdminOtpChallenge = async (req) => {
  const challengeToken = getAdminOtpTokenFromRequest(req);
  const challenge = await findActiveChallengeByToken(challengeToken);

  if (challenge) {
    await markChallengeInvalid(challenge, "cancelled");
  }
};

export const getAccessTokenTtlSeconds = () =>
  Math.floor(parseDurationMs(ACCESS_TOKEN_EXPIRES_IN, 15 * 60 * 1000) / 1000);

export const signAdminAccessToken = (admin) => {
  if (!ACCESS_TOKEN_SECRET) {
    const error = new Error("JWT secret is not configured");
    error.status = 500;
    throw error;
  }

  return jwt.sign(
    {
      tokenType: "admin_access",
      adminId: admin.id,
      email: admin.email,
      roles: admin.roles,
    },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
};

export const verifyAdminAccessToken = (token) => {
  if (!ACCESS_TOKEN_SECRET) {
    const error = new Error("JWT secret is not configured");
    error.status = 500;
    throw error;
  }

  const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
  if (decoded.tokenType !== "admin_access") {
    const error = new Error("Invalid admin token");
    error.status = 401;
    throw error;
  }

  return {
    id: decoded.adminId,
    email: decoded.email,
    roles: decoded.roles || ["super_admin"],
  };
};

export const getActiveAdminById = async (adminId) => {
  const admin = await AdminUser.findOne({ _id: adminId, isActive: true }).select(
    "email roles isActive"
  );
  if (!admin) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }
  return sanitizeAdmin(admin);
};

export const setAdminCookie = (res, token) => {
  res.cookie(ADMIN_COOKIE_NAME, token, getAdminCookieOptions());
};

export const clearAdminCookie = (res) => {
  const options = getAdminCookieOptions();
  delete options.maxAge;
  res.clearCookie(ADMIN_COOKIE_NAME, options);
};

export const setAdminOtpChallengeCookie = (res, challengeToken) => {
  setAdminOtpCookie(res, challengeToken);
};

export const clearAdminOtpChallengeCookie = (res) => {
  clearAdminOtpCookie(res);
};

export const getAdminTokenFromRequest = (req) => req.cookies?.[ADMIN_COOKIE_NAME];

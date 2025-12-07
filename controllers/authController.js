import bcrypt from "bcrypt";
import User from "../models/User.js";
import Category from "../models/Category.js";
import { asyncHandler } from "../utils/errorHandler.js";
import {
  clearAuthCookies,
  issueTokens,
  setAuthCookies,
  verifyAccessToken,
  verifyRefreshToken,
} from "../utils/authTokens.js";

const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name || `${user.fname} ${user.lname}`.trim(),
  fname: user.fname,
  lname: user.lname,
  email: user.email,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  categoryLimit: user.categoryLimit ?? 10,
  defaultIncomeCategories: user.defaultIncomeCategories,
  defaultExpenseCategories: user.defaultExpenseCategories,
});

const ensureDefaultCategories = async (userId) => {
  const defaults = [
    { name: "Sales", type: "income" },
    { name: "Stock", type: "expense" },
  ];

  await Promise.all(
    defaults.map((entry) =>
      Category.findOneAndUpdate(
        { user: userId, name: entry.name, type: entry.type },
        { $setOnInsert: { isDefault: true }, $set: { isActive: true } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  );
};

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

const respondWithAuth = (res, user) => {
  const tokens = issueTokens(user._id);
  setAuthCookies(res, tokens);

  return res.json({
    user: sanitizeUser(user),
  });
};

export const register = asyncHandler(async (req, res) => {
  const { name, fname, lname, email, password } = req.body || {};

  if (!fname || !lname || !email || !password) {
    const error = new Error("fname, lname, email, and password are required");
    error.status = 400;
    throw error;
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    const error = new Error("Email is already registered");
    error.status = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    name,
    fname,
    lname,
    email,
    password: hashedPassword,
  });

  await ensureDefaultCategories(user._id);

  res.status(201);
  respondWithAuth(res, user);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    const error = new Error("email and password are required");
    error.status = 400;
    throw error;
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    const error = new Error("Invalid credentials");
    error.status = 401;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    const error = new Error("Invalid credentials");
    error.status = 401;
    throw error;
  }

  await ensureDefaultCategories(user._id);

  respondWithAuth(res, user);
});

export const getProfile = asyncHandler(async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

export const getSession = asyncHandler(async (req, res) => {
  const token = req.cookies?.accessToken;

  if (!token) {
    const error = new Error("Access token missing");
    error.status = 401;
    throw error;
  }

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      const error = new Error("User not found for this token");
      error.status = 401;
      throw error;
    }

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    handleTokenError(err, "Access token expired", "Invalid access token");
  }
});

export const refreshSession = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    const error = new Error("Refresh token missing");
    error.status = 401;
    throw error;
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      const error = new Error("User not found for this token");
      error.status = 401;
      throw error;
    }

    respondWithAuth(res, user);
  } catch (err) {
    clearAuthCookies(res);
    handleTokenError(err, "Refresh token expired", "Invalid refresh token");
  }
});

export const logout = asyncHandler(async (req, res) => {
  clearAuthCookies(res);
  res.status(204).send();
});

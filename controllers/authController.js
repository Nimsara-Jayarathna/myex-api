import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Category from "../models/Category.js";
import { asyncHandler } from "../utils/errorHandler.js";

const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;
const TOKEN_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const ensureJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
};

const generateToken = (userId) => {
  ensureJwtSecret();
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
};

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

  res.status(201).json({
    token: generateToken(user._id),
    user: sanitizeUser(user),
  });
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

  res.json({
    token: generateToken(user._id),
    user: sanitizeUser(user),
  });
});

export const getProfile = asyncHandler(async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

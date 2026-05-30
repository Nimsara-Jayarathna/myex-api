import bcrypt from "bcrypt";
import crypto from "crypto";
import User from "../../../../models/User.js";
import Currency from "../../../../models/Currency.js";
import { sendAdminPasswordResetNotification } from "../../services/email.service.js";

const ALLOWED_STATUS = new Set(["ACTIVE", "INACTIVE", "SUSPENDED"]);
const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const fullName = (user) => {
  if (user.name && user.name.trim()) {
    return user.name.trim();
  }

  return `${user.fname || ""} ${user.lname || ""}`.trim();
};

export const parseUsersQuery = ({ name, email, userId, status }) => {
  const parsed = {
    name: typeof name === "string" ? name.trim() : "",
    email: typeof email === "string" ? email.trim() : "",
    userId: typeof userId === "string" ? userId.trim() : "",
    status: typeof status === "string" ? status.trim().toUpperCase() : "",
  };

  if (parsed.status && !ALLOWED_STATUS.has(parsed.status)) {
    const error = new Error("Invalid status. Allowed values: ACTIVE, INACTIVE, SUSPENDED.");
    error.status = 400;
    error.details = {
      status: ["Allowed values are ACTIVE, INACTIVE, SUSPENDED."],
    };
    throw error;
  }

  return parsed;
};

export const getAdminUsers = async ({ name, email, userId, status }) => {
  const query = {};

  if (name) {
    const pattern = new RegExp(escapeRegex(name), "i");
    query.$or = [{ name: pattern }, { fname: pattern }, { lname: pattern }];
  }

  if (email) {
    query.email = new RegExp(escapeRegex(email), "i");
  }

  if (status) {
    query.status = status;
  }

  const docs = await User.find(query)
    .sort({ createdAt: -1 })
    .select("name fname lname email status")
    .lean();

  let users = docs.map((doc) => ({
    id: doc._id.toString(),
    name: fullName(doc),
    email: doc.email,
    status: doc.status || "ACTIVE",
  }));

  if (userId) {
    const normalized = userId.toLowerCase();
    users = users.filter((user) => user.id.toLowerCase().includes(normalized));
  }

  return {
    users,
    total: users.length,
  };
};

const formatUserProfile = async (user) => {
  const currency =
    user.currency && typeof user.currency === "object"
      ? user.currency
      : await Currency.findById(user.currency).select("code symbol").lean();

  return {
    id: user._id.toString(),
    name: fullName(user),
    email: user.email,
    status: user.status || "ACTIVE",
    categoryLimit: user.categoryLimit ?? 10,
    defaultCurrency: currency
      ? `${currency.code}${currency.symbol ? ` (${currency.symbol})` : ""}`
      : "N/A",
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt || null,
    role: "CONSUMER",
  };
};

export const getAdminUserById = async (userId) => {
  const user = await User.findById(userId).select(
    "name fname lname email status categoryLimit currency createdAt updatedAt lastLoginAt"
  );

  if (!user) {
    const error = new Error("User not found.");
    error.status = 404;
    throw error;
  }

  return formatUserProfile(user);
};

export const updateAdminUserById = async (userId, payload = {}) => {
  const user = await User.findById(userId).select(
    "name fname lname email status categoryLimit currency createdAt updatedAt lastLoginAt"
  );

  if (!user) {
    const error = new Error("User not found.");
    error.status = 404;
    throw error;
  }

  if (typeof payload.email === "string" && payload.email.trim()) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const duplicate = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: user._id },
    }).select("_id");
    if (duplicate) {
      const error = new Error("Email is already in use.");
      error.status = 409;
      error.details = {
        email: ["Email is already in use."],
      };
      throw error;
    }
    user.email = normalizedEmail;
  }

  if (typeof payload.status === "string") {
    const normalizedStatus = payload.status.trim().toUpperCase();
    if (!ALLOWED_STATUS.has(normalizedStatus)) {
      const error = new Error("Invalid status. Allowed values: ACTIVE, INACTIVE, SUSPENDED.");
      error.status = 400;
      error.details = {
        status: ["Allowed values are ACTIVE, INACTIVE, SUSPENDED."],
      };
      throw error;
    }
    user.status = normalizedStatus;
  }

  if (payload.categoryLimit !== undefined) {
    const parsedLimit = Number(payload.categoryLimit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 0 || parsedLimit > 1000) {
      const error = new Error("Invalid categoryLimit. Must be an integer between 0 and 1000.");
      error.status = 400;
      error.details = {
        categoryLimit: ["Must be an integer between 0 and 1000."],
      };
      throw error;
    }
    user.categoryLimit = parsedLimit;
  }

  await user.save();
  return formatUserProfile(user);
};

const generateTemporaryPassword = (length = 14) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let index = 0; index < length; index += 1) {
    result += chars[bytes[index] % chars.length];
  }
  return result;
};

export const adminResetUserPassword = async (userId) => {
  const user = await User.findById(userId).select("name fname lname email password tokenVersion");
  if (!user) {
    const error = new Error("User not found.");
    error.status = 404;
    throw error;
  }

  const temporaryPassword = generateTemporaryPassword();
  user.password = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);
  user.mustChangePassword = true;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  const displayName = fullName(user);
  await sendAdminPasswordResetNotification(user.email, displayName || "User", temporaryPassword);

  return {
    userId: user._id.toString(),
    email: user.email,
  };
};

export const adminForceLogoutUser = async (userId) => {
  const user = await User.findById(userId).select("tokenVersion");
  if (!user) {
    const error = new Error("User not found.");
    error.status = 404;
    throw error;
  }

  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  return {
    userId: user._id.toString(),
    tokenVersion: user.tokenVersion,
  };
};

export const getAdminUserActivity = async (userId) => {
  const user = await User.findById(userId).select("createdAt updatedAt lastLoginAt").lean();
  if (!user) {
    const error = new Error("User not found.");
    error.status = 404;
    throw error;
  }

  const activity = [];
  if (user.lastLoginAt) {
    activity.push({
      event: "Login",
      details: "Last successful login",
      date: user.lastLoginAt,
    });
  }
  if (user.updatedAt) {
    activity.push({
      event: "Profile Update",
      details: "Account information updated",
      date: user.updatedAt,
    });
  }
  if (user.createdAt) {
    activity.push({
      event: "Account Created",
      details: "User account created",
      date: user.createdAt,
    });
  }

  return activity.sort((a, b) => new Date(b.date) - new Date(a.date));
};

import bcrypt from "bcrypt";
import User from "../../../models/User.js";
import Category from "../../../models/Category.js";
import { hashEmail } from "../../../utils/logger.js";
import { issueTokens, verifyAccessToken, verifyRefreshToken } from "../../../utils/authTokens.js";

const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;

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

export const registerUser = async ({ name, fname, lname, email, password }) => {
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

    const tokens = issueTokens(user._id);

    return { user, tokens };
};

export const loginUser = async ({ email, password }) => {
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

    // Ensure default categories exist (in case of legacy users or manual db edits)
    await ensureDefaultCategories(user._id);

    const tokens = issueTokens(user._id);

    return { user, tokens };
};

export const getUserSession = async (token) => {
    if (!token) {
        const error = new Error("Access token missing");
        error.status = 401;
        throw error;
    }

    const decoded = verifyAccessToken(token); // May throw TokenExpiredError
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
        const error = new Error("User not found for this token");
        error.status = 401;
        throw error;
    }

    return user;
};

export const refreshUserSession = async (refreshToken) => {
    if (!refreshToken) {
        const error = new Error("Refresh token missing");
        error.status = 401;
        throw error;
    }

    const decoded = verifyRefreshToken(refreshToken); // May throw
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
        const error = new Error("User not found for this token");
        error.status = 401;
        throw error;
    }

    // Issue new tokens on refresh is a common pattern, 
    // but the original controller only re-issued if we treat `respondWithAuth` as doing so.
    // The original `respondWithAuth` calls `issueTokens`. 
    // So yes, we issue new access/refresh tokens.
    const tokens = issueTokens(user._id);

    return { user, tokens };
};

export const sanitizeUser = (user) => ({
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

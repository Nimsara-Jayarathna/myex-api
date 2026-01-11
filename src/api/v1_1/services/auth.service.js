
import bcrypt from "bcrypt";
import crypto from "crypto";
import User from "../../../models/User.js";
import Token from "../../../models/Token.js";
import Category from "../../../models/Category.js";
import Currency from "../../../models/Currency.js";
import { issueTokens, verifyAccessToken, verifyRefreshToken } from "../../../utils/authTokens.js";
import { sendOtpEmail, sendPasswordResetEmail, sendChangeEmailVerification, sendWelcomeEmail, sendPasswordChangeNotification } from "./email.service.js";

const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

const generateOtp = () => crypto.randomInt(100000, 999999).toString();
const generateToken = () => crypto.randomBytes(32).toString("hex");

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

// --- Registration Flow ---

export const initiateRegistration = async (email) => {
    if (!email) throw { status: 400, message: "Email is required" };
    email = email.toLowerCase().trim();

    const existing = await User.findOne({ email });
    if (existing) throw { status: 409, message: "Email is already registered" };

    const otp = generateOtp();
    // Delete any existing register OTPs for this email
    await Token.deleteMany({ email, type: "register_otp" });

    await Token.create({
        email,
        token: otp,
        type: "register_otp",
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS)
    });

    await sendOtpEmail(email, otp);
    return { message: "OTP sent successfully" };
};

export const verifyRegistrationOtp = async (email, otp) => {
    if (!email || !otp) throw { status: 400, message: "Email and OTP are required" };
    email = email.toLowerCase().trim();

    const tokenRecord = await Token.findOne({ email, token: otp, type: "register_otp" });
    if (!tokenRecord) throw { status: 400, message: "Invalid or expired OTP" };

    await Token.deleteMany({ email, type: "registration_verified" });

    const regToken = generateToken();
    await Token.create({
        email,
        token: regToken,
        type: "registration_verified",
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS)
    });

    await Token.deleteOne({ _id: tokenRecord._id });
    return { registrationToken: regToken };
};

export const completeRegistration = async ({ registrationToken, name, fname, lname, password }) => {
    if (!registrationToken) throw { status: 400, message: "Registration token is required" };

    const tokenRecord = await Token.findOne({ token: registrationToken, type: "registration_verified" });
    if (!tokenRecord) throw { status: 400, message: "Invalid or expired registration session" };

    const email = tokenRecord.email;
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const existing = await User.findOne({ email });
    if (existing) throw { status: 409, message: "Email is already registered" };

    const user = await User.create({
        name,
        fname,
        lname,
        email,
        password: hashedPassword,
    });

    const defaultCurrency = await Currency.findOne({ isDefault: true });
    if (defaultCurrency) {
        user.currency = defaultCurrency._id;
        await user.save();
    }

    await ensureDefaultCategories(user._id);
    await Token.deleteOne({ _id: tokenRecord._id });

    // Send Welcome Email (Fire and forget)
    sendWelcomeEmail(user.email, user.name).catch(err => console.error("Failed to send welcome email:", err));

    const tokens = issueTokens(user._id);
    return { user, tokens };
};

// --- Password Management ---

export const requestPasswordReset = async (email) => {
    if (!email) throw { status: 400, message: "Email is required" };
    email = email.toLowerCase().trim();
    console.log(`Debug forgotPassword: looking up ${email}`);

    const user = await User.findOne({ email });
    if (!user) {
        throw { status: 404, message: "User not found" };
    }

    const resetToken = generateToken();
    await Token.deleteMany({ userId: user._id, type: "reset_token" });

    await Token.create({
        userId: user._id,
        email,
        token: resetToken,
        type: "reset_token",
        expiresAt: new Date(Date.now() + 3600000)
    });

    const link = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    await sendPasswordResetEmail(email, link);

    return { message: "If that email exists, a reset link has been sent." };
};

export const resetPassword = async (token, newPassword) => {
    if (!token || !newPassword) throw { status: 400, message: "Token and new password are required" };

    const tokenRecord = await Token.findOne({ token, type: "reset_token" });
    if (!tokenRecord) throw { status: 400, message: "Invalid or expired reset token" };

    const user = await User.findById(tokenRecord.userId);
    if (!user) throw { status: 400, message: "User not found" };

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.password = hashedPassword;
    await user.save();

    await Token.deleteOne({ _id: tokenRecord._id });
    return { message: "Password reset successfully" };
};

export const changePassword = async (userId, currentPassword, newPassword) => {
    if (!currentPassword || !newPassword) throw { status: 400, message: "Current and new passwords are required" };

    const user = await User.findById(userId);
    if (!user) throw { status: 404, message: "User not found" };

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw { status: 401, message: "Incorrect current password" };

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.password = hashedPassword;
    await user.save();

    // Notify user of password change
    const name = user.name || `${user.fname} ${user.lname}`.trim();
    sendPasswordChangeNotification(user.email, name).catch(err => console.error("Failed to send password change alert:", err));

    return { message: "Password changed successfully" };
};

// --- Change Email Flow ---

export const initiateChangeEmail = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw { status: 404, message: "User not found" };

    const otp = generateOtp();
    await Token.deleteMany({ userId, type: "email_change_current" });

    await Token.create({
        userId,
        email: user.email,
        token: otp,
        type: "email_change_current",
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS)
    });

    await sendChangeEmailVerification(user.email, otp);
    return { message: "Verification code sent to current email" };
};

export const verifyCurrentEmail = async (userId, otp) => {
    const tokenRecord = await Token.findOne({ userId, token: otp, type: "email_change_current" });
    if (!tokenRecord) throw { status: 400, message: "Invalid or expired code" };

    await Token.deleteMany({ userId, type: "email_change_verified" });

    const changeToken = generateToken();
    await Token.create({
        userId,
        token: changeToken,
        type: "email_change_verified",
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS)
    });

    await Token.deleteOne({ _id: tokenRecord._id });
    return { changeToken };
};

export const requestNewEmail = async (userId, changeToken, newEmail) => {
    if (!newEmail) throw { status: 400, message: "New email is required" };
    newEmail = newEmail.toLowerCase().trim();

    const permToken = await Token.findOne({ userId, token: changeToken, type: "email_change_verified" });
    if (!permToken) throw { status: 403, message: "Unauthorized or session expired" };

    if (await User.findOne({ email: newEmail })) throw { status: 409, message: "Email already in use" };

    const otp = generateOtp();
    await Token.deleteMany({ userId, type: "email_change_new" });

    await Token.create({
        userId,
        email: newEmail,
        token: otp,
        type: "email_change_new",
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MS)
    });

    await sendChangeEmailVerification(newEmail, otp);
    return { message: "Verification code sent to new email" };
};

export const confirmNewEmail = async (userId, otp) => {
    const tokenRecord = await Token.findOne({ userId, token: otp, type: "email_change_new" });
    if (!tokenRecord) throw { status: 400, message: "Invalid or expired code" };

    const user = await User.findById(userId);
    user.email = tokenRecord.email;
    await user.save();

    await Token.deleteOne({ _id: tokenRecord._id });
    await Token.deleteMany({ userId, type: "email_change_verified" });

    return { message: "Email updated successfully", email: user.email };
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
    currency: user.currency ? {
        id: user.currency._id,
        name: user.currency.name,
        code: user.currency.code,
        symbol: user.currency.symbol
    } : null,
});

export const updateUserDetails = async (userId, fname, lname) => {
    const user = await User.findById(userId);
    if (!user) throw { status: 404, message: "User not found" };

    if (fname) user.fname = fname.trim();
    if (lname) user.lname = lname.trim();

    // Update the main name field if it exists, or just rely on virtual fullName
    // Since name is optional/display name, we might want to update it if it was automatically set
    if (user.name && user.name === `${user.fname} ${user.lname}`) {
        user.name = `${user.fname} ${user.lname}`.trim();
    }

    await user.save();
    return { user: sanitizeUser(user) };
};

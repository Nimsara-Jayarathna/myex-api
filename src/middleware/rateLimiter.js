import rateLimit from "express-rate-limit";
import { sendError } from "../utils/responseHelper.js";
import { ERROR_CODES, HTTP_STATUS } from "../utils/errorCodes.js";

const createHandler = (message) => (req, res, _next, options) => {
    try {
        if (req.originalUrl && req.originalUrl.startsWith("/api/v1.1")) {
            return sendError(res, {
                code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
                message: message
            }, HTTP_STATUS.TOO_MANY_REQUESTS);
        }

        res.status(options.statusCode || 429).json({
            status: options.statusCode || 429,
            message: message,
        });
    } catch (error) {
        console.error("Rate Limit Handler Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// General rate limit for most routes (e.g., 100 requests per 15 minutes)
export const globalLimiter = rateLimit({
    windowMs: (Number(process.env.GLOBAL_LIMIT_WINDOW_MS) || 1 * 60 * 1000), // Default: 1 minute
    max: (Number(process.env.GLOBAL_LIMIT_MAX) || 100), // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: createHandler("Too many requests from this IP, please try again later"),
});

// Strict rate limit for auth routes (e.g., 5 requests per 15 minutes)
// Helps prevent brute-force attacks on login/register
export const authLimiter = rateLimit({
    windowMs: (Number(process.env.AUTH_LIMIT_WINDOW_MS) || 1 * 60 * 1000), // Default: 1 minute
    max: (Number(process.env.AUTH_LIMIT_MAX) || 5), // limit each IP to 5 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    handler: createHandler("Too many login attempts, please try again later"),
    skipSuccessfulRequests: true,
});

// Rate limit specifically for endpoints that send emails (OTP, Forgot Password, etc.)
// Prevents email spamming/bombing
export const emailLimiter = rateLimit({
    windowMs: (Number(process.env.EMAIL_LIMIT_WINDOW_MS) || 10 * 60 * 1000), // Default: 10 minutes
    max: (Number(process.env.EMAIL_LIMIT_MAX) || 3), // Default: 3 requests per IP per window
    standardHeaders: true,
    legacyHeaders: false,
    handler: createHandler("Too many email requests, please try again later"),
});

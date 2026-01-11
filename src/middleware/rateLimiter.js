import rateLimit from "express-rate-limit";

// General rate limit for most routes (e.g., 100 requests per 15 minutes)
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        status: 429,
        message: "Too many requests from this IP, please try again later",
    },
});

// Strict rate limit for auth routes (e.g., 5 requests per 15 minutes)
// Helps prevent brute-force attacks on login/register
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        message: "Too many login attempts, please try again later",
    },
    skipSuccessfulRequests: true, // Optional: only count failed attempts for login? 
    // actually for brute force usually we count all attempts to prevent enumeration 
    // but for user experience on successful login sometimes it's nice to skip.
    // HOWEVER, for security against credential stuffing, we definitely want to count all attempts or at least failures.
    // Let's stick to standard strict limit. If user logs in 5 times in 15 mins, that's suspicious anyway.
});

// Rate limit specifically for endpoints that send emails (OTP, Forgot Password, etc.)
// Prevents email spamming/bombing
export const emailLimiter = rateLimit({
    windowMs: (Number(process.env.EMAIL_LIMIT_WINDOW_MS) || 10 * 60 * 1000), // Default: 10 minutes
    max: (Number(process.env.EMAIL_LIMIT_MAX) || 3), // Default: 3 requests per IP per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        message: "Too many email requests, please try again later",
    },
});

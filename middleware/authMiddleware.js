import User from "../models/User.js";
import { asyncHandler } from "../utils/errorHandler.js";
import { verifyAccessToken } from "../utils/authTokens.js";

export const protect = asyncHandler(async (req, _res, next) => {
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

    req.user = user;
    next();
  } catch (err) {
    const error = new Error(err.name === "TokenExpiredError" ? "Access token expired" : "Not authorized");
    error.status = err.name === "TokenExpiredError" ? 419 : 401;
    throw error;
  }
});

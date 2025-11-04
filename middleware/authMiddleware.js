import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { asyncHandler } from "../utils/errorHandler.js";

export const protect = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const error = new Error("Authorization token missing");
    error.status = 401;
    throw error;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      const error = new Error("User not found for this token");
      error.status = 401;
      throw error;
    }

    req.user = user;
    next();
  } catch (err) {
    const error = new Error("Not authorized");
    error.status = 401;
    throw error;
  }
});

import { asyncHandler } from "../../../../utils/errorHandler.js";
import {
  getAdminTokenFromRequest,
  verifyAdminAccessToken,
} from "../services/adminAuth.service.js";

export const requireAdminAuth = asyncHandler(async (req, _res, next) => {
  const token = getAdminTokenFromRequest(req);

  if (!token) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }

  try {
    req.admin = verifyAdminAccessToken(token);
    next();
  } catch (_err) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }
});

import { sendError } from "./responseHelper.js";
import { ERROR_CODES, HTTP_STATUS } from "./errorCodes.js";

export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export const notFound = (req, _res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = HTTP_STATUS.NOT_FOUND;
  error.code = ERROR_CODES.RESOURCE_NOT_FOUND;
  next(error);
};

export const errorHandler = (err, req, res, _next) => {
  let statusCode = err.status || err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || "Something went wrong";
  let code = err.code || ERROR_CODES.INTERNAL_SERVER_ERROR;
  let details = err.details || undefined;

  // Handle Mongoose Validation Error
  if (err.name === "ValidationError") {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    code = ERROR_CODES.VALIDATION_ERROR;
    message = "Validation Error";
    details = {};
    Object.values(err.errors).forEach((val) => {
      details[val.path] = val.message;
    });
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = HTTP_STATUS.BAD_REQUEST; // or 409 Conflict
    code = ERROR_CODES.RESOURCE_ALREADY_EXISTS;
    message = "Duplicate field value entered";
    // Check if it's a user email duplicate
    if (err.keyPattern && err.keyPattern.email) {
      code = ERROR_CODES.USER_ALREADY_EXISTS;
      message = "User with this email already exists";
    }
  }

  // Handle Mongoose Cast Error
  if (err.name === "CastError") {
    statusCode = HTTP_STATUS.NOT_FOUND;
    code = ERROR_CODES.RESOURCE_NOT_FOUND;
    message = `Resource not found with id of ${err.value}`;
  }

  // Handle JWT Error
  if (err.name === "JsonWebTokenError") {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    code = ERROR_CODES.AUTH_INVALID_CREDENTIALS;
    message = "Invalid token";
  }

  // Handle Token Expired Error
  if (err.name === "TokenExpiredError") {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    code = ERROR_CODES.AUTH_TOKEN_EXPIRED;
    message = "Token expired";
  }

  // Log error in production (or always if needed)
  res.locals.errorMessage = message;

  // Only use standard error format for v1.1 API
  if (req.originalUrl.startsWith("/api/v1.1")) {
    return sendError(res, { code, message, details }, statusCode);
  }

  // Legacy Error Response (v1 and others)
  const response = {
    message: message,
  };

  if (err.errors) {
    response.errors = err.errors;
  }

  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

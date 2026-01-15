import { HTTP_STATUS, ERROR_CODES } from "./errorCodes.js";

/**
 * Sends a standardized success response.
 * @param {Response} res - Express response object
 * @param {any} data - Payload data
 * @param {string} message - Optional human-readable message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export const sendSuccess = (res, data, message = "Operation successful", statusCode = HTTP_STATUS.OK) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

/**
 * Sends a standardized error response.
 * @param {Response} res - Express response object
 * @param {Object} error - Error object
 * @param {string} error.code - Machine-readable error code
 * @param {string} error.message - Human-readable error message
 * @param {Object} [error.details] - Optional validation details
 * @param {number} statusCode - HTTP status code (default: 500)
 */
export const sendError = (res, { code, message, details }, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR) => {
    return res.status(statusCode).json({
        success: false,
        error: {
            code: code || ERROR_CODES.INTERNAL_SERVER_ERROR,
            message: message || "An unexpected error occurred",
            details: details || undefined,
        },
    });
};

/**
 * Sends a No Content response (204).
 * @param {Response} res - Express response object
 */
export const sendNoContent = (res) => {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
};

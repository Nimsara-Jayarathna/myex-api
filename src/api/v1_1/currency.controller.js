import { asyncHandler } from "../../utils/errorHandler.js";
import * as currencyService from "./services/currency.service.js";
import { sendSuccess } from "../../utils/responseHelper.js";
import { ERROR_CODES, HTTP_STATUS } from "../../utils/errorCodes.js";

export const listCurrencies = asyncHandler(async (req, res) => {
    const userCurrencyId = req.user ? req.user.currency : null;
    const currencies = await currencyService.getAllCurrencies(userCurrencyId);
    sendSuccess(res, { currencies }, "Currencies retrieved successfully");
});

export const updateUserCurrency = asyncHandler(async (req, res) => {
    const { currencyId } = req.body;

    if (!currencyId) {
        const error = new Error("Currency ID is required");
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        error.code = ERROR_CODES.VALIDATION_ERROR;
        throw error;
    }

    const updatedCurrency = await currencyService.updateUserCurrency(req.user._id, currencyId);
    sendSuccess(res, { currency: updatedCurrency }, "Currency updated successfully");
});

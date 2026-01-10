import { asyncHandler } from "../../utils/errorHandler.js";
import * as currencyService from "./services/currency.service.js";

export const listCurrencies = asyncHandler(async (req, res) => {
    const currencies = await currencyService.getAllCurrencies();
    res.json({ currencies });
});

export const updateUserCurrency = asyncHandler(async (req, res) => {
    const { currencyId } = req.body;

    if (!currencyId) {
        const error = new Error("Currency ID is required");
        error.status = 400;
        throw error;
    }

    const updatedCurrency = await currencyService.updateUserCurrency(req.user._id, currencyId);
    res.json({ currency: updatedCurrency, message: "Currency updated successfully" });
});

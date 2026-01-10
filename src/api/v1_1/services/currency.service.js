import Currency from "../../../models/Currency.js";
import User from "../../../models/User.js";

export const getAllCurrencies = async () => {
    return Currency.find({}).sort({ name: 1 }); // List all, maybe filter by active if we had that, but User asked to remove isActive.
};

export const updateUserCurrency = async (userId, currencyId) => {
    const currency = await Currency.findById(currencyId);
    if (!currency) {
        const error = new Error("Invalid currency ID");
        error.status = 400;
        throw error;
    }

    const user = await User.findById(userId);
    if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
    }

    user.currency = currency._id;
    await user.save();

    // Return the updated currency object for the response
    return {
        id: currency._id,
        name: currency.name,
        code: currency.code,
        symbol: currency.symbol
    };
};

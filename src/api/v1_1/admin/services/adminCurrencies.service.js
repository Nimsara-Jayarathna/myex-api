import Currency from "../../../../models/Currency.js";

const ALLOWED_STATUS = new Set(["ALL", "DEFAULT", "ENABLED", "DISABLED"]);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toCurrencyStatus = (currency) => {
  if (currency.isDefault) {
    return "DEFAULT";
  }
  return currency.isActive === false ? "DISABLED" : "ENABLED";
};

const mapCurrency = (currency) => ({
  id: currency._id.toString(),
  code: currency.code,
  name: currency.name,
  symbol: currency.symbol,
  isActive: currency.isActive !== false,
  isDefault: Boolean(currency.isDefault),
  status: toCurrencyStatus(currency),
});

const validateCurrencyCode = (rawCode) => {
  if (typeof rawCode !== "string" || !rawCode.trim()) {
    const error = new Error("Currency code is required.");
    error.status = 400;
    error.details = { code: ["Currency code is required."] };
    throw error;
  }

  const code = rawCode.trim().toUpperCase();
  if (!/^[A-Z]{2,10}$/.test(code)) {
    const error = new Error("Currency code must use 2-10 uppercase letters.");
    error.status = 400;
    error.details = { code: ["Use 2-10 uppercase letters."] };
    throw error;
  }
  return code;
};

const validateCurrencyName = (rawName) => {
  if (typeof rawName !== "string" || !rawName.trim()) {
    const error = new Error("Currency name is required.");
    error.status = 400;
    error.details = { name: ["Currency name is required."] };
    throw error;
  }
  return rawName.trim();
};

const validateCurrencySymbol = (rawSymbol) => {
  if (typeof rawSymbol !== "string" || !rawSymbol.trim()) {
    const error = new Error("Currency symbol is required.");
    error.status = 400;
    error.details = { symbol: ["Currency symbol is required."] };
    throw error;
  }
  return rawSymbol.trim();
};

export const parseCurrenciesQuery = ({ code, name, symbol, status }) => {
  const parsed = {
    code: typeof code === "string" ? code.trim().toUpperCase() : "",
    name: typeof name === "string" ? name.trim() : "",
    symbol: typeof symbol === "string" ? symbol.trim() : "",
    status: typeof status === "string" ? status.trim().toUpperCase() : "ALL",
  };

  if (!ALLOWED_STATUS.has(parsed.status)) {
    const error = new Error("Invalid status. Allowed values: ALL, DEFAULT, ENABLED, DISABLED.");
    error.status = 400;
    error.details = { status: ["Allowed values are ALL, DEFAULT, ENABLED, DISABLED."] };
    throw error;
  }

  return parsed;
};

export const getAdminCurrencies = async ({ code, name, symbol, status }) => {
  const query = {};

  if (code) {
    query.code = new RegExp(escapeRegex(code), "i");
  }
  if (name) {
    query.name = new RegExp(escapeRegex(name), "i");
  }
  if (symbol) {
    query.symbol = new RegExp(escapeRegex(symbol), "i");
  }
  if (status === "DEFAULT") {
    query.isDefault = true;
  } else if (status === "ENABLED") {
    query.isDefault = false;
    query.$or = [{ isActive: true }, { isActive: { $exists: false } }];
  } else if (status === "DISABLED") {
    query.isDefault = false;
    query.isActive = false;
  }

  const docs = await Currency.find(query).sort({ isDefault: -1, code: 1 }).lean();
  const currencies = docs.map(mapCurrency);

  return {
    currencies,
    total: currencies.length,
  };
};

export const getAdminCurrencyById = async (currencyId) => {
  const currency = await Currency.findById(currencyId);
  if (!currency) {
    const error = new Error("Currency not found.");
    error.status = 404;
    throw error;
  }
  return mapCurrency(currency);
};

const ensureUniqueCode = async (code, excludeId) => {
  const query = { code };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const existing = await Currency.findOne(query).select("_id");
  if (existing) {
    const error = new Error("Currency code already exists.");
    error.status = 409;
    error.details = { code: ["Currency code already exists."] };
    throw error;
  }
};

const setDefaultCurrency = async (currency) => {
  await Currency.updateMany({ _id: { $ne: currency._id }, isDefault: true }, { $set: { isDefault: false } });
  currency.isDefault = true;
  currency.isActive = true;
};

export const createAdminCurrency = async (payload = {}) => {
  const code = validateCurrencyCode(payload.code);
  const name = validateCurrencyName(payload.name);
  const symbol = validateCurrencySymbol(payload.symbol);
  const isActive = payload.isActive !== undefined ? Boolean(payload.isActive) : true;
  const isDefault = Boolean(payload.isDefault);

  await ensureUniqueCode(code);

  const currency = new Currency({
    code,
    name,
    symbol,
    isActive: isDefault ? true : isActive,
    isDefault: false,
  });

  if (isDefault) {
    await setDefaultCurrency(currency);
  }

  await currency.save();
  return mapCurrency(currency);
};

export const updateAdminCurrencyById = async (currencyId, payload = {}) => {
  const currency = await Currency.findById(currencyId);
  if (!currency) {
    const error = new Error("Currency not found.");
    error.status = 404;
    throw error;
  }

  if (payload.code !== undefined) {
    const code = validateCurrencyCode(payload.code);
    await ensureUniqueCode(code, currency._id);
    currency.code = code;
  }

  if (payload.name !== undefined) {
    currency.name = validateCurrencyName(payload.name);
  }

  if (payload.symbol !== undefined) {
    currency.symbol = validateCurrencySymbol(payload.symbol);
  }

  if (payload.isActive !== undefined) {
    const nextActive = Boolean(payload.isActive);
    if (!nextActive && currency.isDefault) {
      const error = new Error("Default currency cannot be disabled.");
      error.status = 400;
      error.details = { isActive: ["Default currency cannot be disabled."] };
      throw error;
    }
    currency.isActive = nextActive;
  }

  if (payload.isDefault === true && !currency.isDefault) {
    await setDefaultCurrency(currency);
  }

  await currency.save();
  return mapCurrency(currency);
};

export const setAdminCurrencyDefault = async (currencyId) => {
  const currency = await Currency.findById(currencyId);
  if (!currency) {
    const error = new Error("Currency not found.");
    error.status = 404;
    throw error;
  }

  await setDefaultCurrency(currency);
  await currency.save();
  return mapCurrency(currency);
};

export const toggleAdminCurrencyStatus = async (currencyId, isActive) => {
  const currency = await Currency.findById(currencyId);
  if (!currency) {
    const error = new Error("Currency not found.");
    error.status = 404;
    throw error;
  }

  const nextActive = Boolean(isActive);
  if (!nextActive && currency.isDefault) {
    const error = new Error("Default currency cannot be disabled.");
    error.status = 400;
    error.details = { isActive: ["Default currency cannot be disabled."] };
    throw error;
  }

  currency.isActive = nextActive;
  await currency.save();
  return mapCurrency(currency);
};

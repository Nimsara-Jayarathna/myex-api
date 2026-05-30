import User from "../../../../models/User.js";
import Transaction from "../../../../models/Transaction.js";
import Currency from "../../../../models/Currency.js";

const PERIOD_MAP = {
  "30d": 30,
  "90d": 90,
};

const roundPct = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value);
};

const getPeriodStart = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const getUserGrowthDelta = async (days) => {
  const now = new Date();
  const currentStart = getPeriodStart(days);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - days);

  const [current, previous] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: currentStart, $lte: now } }),
    User.countDocuments({ createdAt: { $gte: previousStart, $lt: currentStart } }),
  ]);

  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return roundPct(((current - previous) / previous) * 100);
};

const getActiveUsers = async (periodStart, days) => {
  const activeIds = await Transaction.distinct("user", {
    date: { $gte: periodStart },
    status: "active",
  });

  const activeUsers = activeIds.length;

  const previousStart = new Date(periodStart);
  previousStart.setDate(previousStart.getDate() - days);

  const previousActiveIds = await Transaction.distinct("user", {
    date: { $gte: previousStart, $lt: periodStart },
    status: "active",
  });

  const previousActiveUsers = previousActiveIds.length;
  const deltaPct =
    previousActiveUsers === 0
      ? activeUsers > 0
        ? 100
        : 0
      : roundPct(((activeUsers - previousActiveUsers) / previousActiveUsers) * 100);

  return { value: activeUsers, deltaPct };
};

const getDefaultCurrencySummary = async () => {
  const defaultCurrency = await Currency.findOne({ isDefault: true }).select("code");
  return {
    value: defaultCurrency?.code || "N/A",
    deltaPct: 0,
  };
};

const buildCurrencySegments = (rows, totalAmount) => {
  if (!totalAmount || rows.length === 0) {
    return [];
  }

  const sorted = [...rows].sort((a, b) => b.amount - a.amount);
  const top = sorted.slice(0, 2);
  const otherAmount = sorted.slice(2).reduce((sum, item) => sum + item.amount, 0);

  const segments = top.map((item) => ({
    code: item.code,
    amount: Number(item.amount.toFixed(2)),
    percent: roundPct((item.amount / totalAmount) * 100),
  }));

  if (otherAmount > 0) {
    segments.push({
      code: "OTHER",
      amount: Number(otherAmount.toFixed(2)),
      percent: roundPct((otherAmount / totalAmount) * 100),
    });
  }

  return segments;
};

const getCurrencyUsage = async (periodStart, period) => {
  const rows = await Transaction.aggregate([
    {
      $match: {
        status: "active",
        date: { $gte: periodStart },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDoc",
      },
    },
    { $unwind: "$userDoc" },
    {
      $lookup: {
        from: "currencies",
        localField: "userDoc.currency",
        foreignField: "_id",
        as: "currencyDoc",
      },
    },
    {
      $addFields: {
        currencyCode: {
          $ifNull: [{ $arrayElemAt: ["$currencyDoc.code", 0] }, "OTHER"],
        },
      },
    },
    {
      $group: {
        _id: "$currencyCode",
        amount: { $sum: "$amount" },
      },
    },
  ]);

  const normalized = rows.map((row) => ({
    code: row._id || "OTHER",
    amount: Math.max(0, Number(row.amount || 0)),
  }));
  const totalAmount = normalized.reduce((sum, item) => sum + item.amount, 0);

  return {
    period,
    totalAmount: Number(totalAmount.toFixed(2)),
    segments: buildCurrencySegments(normalized, totalAmount),
  };
};

const getRecentEvents = async (eventsLimit) => {
  const recentFailedLogins = await Transaction.find({ status: "undone" })
    .sort({ updatedAt: -1 })
    .limit(eventsLimit)
    .select("title updatedAt");

  return recentFailedLogins.map((event) => ({
    level: "WARN",
    message: event.title || "Recent undone transaction detected",
    occurredAt: new Date(event.updatedAt || event.createdAt).toISOString(),
  }));
};

export const parseDashboardQuery = ({ period, eventsLimit }) => {
  const normalizedPeriod = period || "30d";
  if (!PERIOD_MAP[normalizedPeriod]) {
    const error = new Error("Invalid period. Allowed values: 30d, 90d.");
    error.status = 400;
    error.details = { period: ["Allowed values are 30d or 90d."] };
    throw error;
  }

  const parsedLimit = eventsLimit ? Number(eventsLimit) : 6;
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
    const error = new Error("Invalid eventsLimit. Must be an integer between 1 and 50.");
    error.status = 400;
    error.details = { eventsLimit: ["Must be an integer between 1 and 50."] };
    throw error;
  }

  return {
    period: normalizedPeriod,
    days: PERIOD_MAP[normalizedPeriod],
    eventsLimit: parsedLimit,
  };
};

export const getDashboardSnapshot = async ({ period, days, eventsLimit }) => {
  const periodStart = getPeriodStart(days);

  const [totalUsers, totalUsersDelta, activeUsers, defaultCurrency, currencyUsage, recentEvents] =
    await Promise.all([
      User.countDocuments({}),
      getUserGrowthDelta(days),
      getActiveUsers(periodStart, days),
      getDefaultCurrencySummary(),
      getCurrencyUsage(periodStart, period),
      getRecentEvents(eventsLimit),
    ]);

  return {
    summary: {
      totalUsers: {
        value: totalUsers,
        deltaPct: totalUsersDelta,
      },
      activeUsers,
      defaultCurrency,
      errorCount: {
        value: 0,
        deltaPct: 0,
      },
    },
    currencyUsage,
    recentEvents,
  };
};

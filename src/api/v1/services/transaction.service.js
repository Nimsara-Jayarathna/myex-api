import mongoose from "mongoose";
import Transaction from "../../../models/Transaction.js";
import Category from "../../../models/Category.js";

const ALLOWED_TYPES = ["income", "expense"];
const ALLOWED_STATUS = ["active", "undone"];

const normalizeCategoryName = (category) => category?.trim();

const normalizeToUtcMidnight = (value) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        const error = new Error("date is invalid");
        error.status = 400;
        throw error;
    }

    parsed.setUTCHours(0, 0, 0, 0);
    return parsed;
};

const isValidTimeZone = (timeZone) => {
    try {
        new Intl.DateTimeFormat("en-US", { timeZone }).format();
        return true;
    } catch (error) {
        return false;
    }
};

const getLocalDateKey = (date, timeZone) => {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });

    const parts = formatter.formatToParts(date);
    const values = {};

    for (const part of parts) {
        if (part.type === "year" || part.type === "month" || part.type === "day") {
            values[part.type] = part.value;
        }
    }

    return `${values.year}-${values.month}-${values.day}`;
};

const deriveCategoryLookup = ({ category, categoryId }) => {
    const normalizedCategoryId =
        typeof categoryId === "string" ? categoryId.trim() : categoryId;

    if (normalizedCategoryId) {
        return { categoryId: normalizedCategoryId, categoryName: undefined };
    }

    const normalizedCategory = normalizeCategoryName(category);
    if (normalizedCategory && mongoose.Types.ObjectId.isValid(normalizedCategory)) {
        return { categoryId: normalizedCategory, categoryName: undefined };
    }

    return {
        categoryId: undefined,
        categoryName: normalizedCategory || undefined,
    };
};

const resolveCategory = async ({ userId, type, categoryName, categoryId }) => {
    if (!type || !ALLOWED_TYPES.includes(type)) {
        const error = new Error("type must be either income or expense");
        error.status = 400;
        throw error;
    }

    let category = null;

    if (categoryId) {
        if (!mongoose.Types.ObjectId.isValid(categoryId)) {
            const error = new Error("categoryId is invalid");
            error.status = 400;
            throw error;
        }

        category = await Category.findOne({
            _id: categoryId,
            type,
            $or: [{ user: userId }, { user: null }],
        });
    } else if (categoryName) {
        const normalized = normalizeCategoryName(categoryName);
        if (!normalized) {
            const error = new Error("category name is required");
            error.status = 400;
            throw error;
        }

        category = await Category.findOne({
            type,
            name: normalized,
            $or: [{ user: userId }, { user: null }],
        });
    }

    if (!category) {
        const error = new Error("Category not found. Create it before assigning to a transaction.");
        error.status = 404;
        throw error;
    }

    if (!category.isActive) {
        const error = new Error("Category is inactive");
        error.status = 400;
        throw error;
    }

    return category;
};

const resolveCategoryForCreation = async ({ user, type, category, categoryId }) => {
    const { categoryId: resolvedCategoryId, categoryName: providedCategoryName } =
        deriveCategoryLookup({ category, categoryId });

    const defaultCategoryName =
        type === "income"
            ? normalizeCategoryName(user.defaultIncomeCategories?.[0])
            : normalizeCategoryName(user.defaultExpenseCategories?.[0]);

    const fallbackCategoryName =
        resolvedCategoryId ? undefined : providedCategoryName || defaultCategoryName || undefined;

    if (!resolvedCategoryId && !fallbackCategoryName) {
        const error = new Error("category is required");
        error.status = 400;
        throw error;
    }

    return resolveCategory({
        userId: user._id,
        type,
        categoryName: fallbackCategoryName,
        categoryId: resolvedCategoryId,
    });
};

const buildTransactionResponse = (transaction) => ({
    id: transaction._id,
    _id: transaction._id,
    user: transaction.user,
    title: transaction.title,
    description: transaction.description,
    note: transaction.description,
    type: transaction.type,
    category: transaction.category,
    categoryName: transaction.category,
    categoryId: transaction.categoryId,
    amount: transaction.amount,
    date: transaction.date,
    status: transaction.status,
    isCustomDate: transaction.isCustomDate,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
});

export const createTransaction = async (user, body, requireDate = false) => {
    const {
        title,
        type,
        amount,
        category,
        categoryId,
        date,
        description,
        note,
        status,
    } = body || {};

    if (!type || !ALLOWED_TYPES.includes(type)) {
        const error = new Error("type must be either income or expense");
        error.status = 400;
        throw error;
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        const error = new Error("amount must be a positive number");
        error.status = 400;
        throw error;
    }

    if (requireDate && !date) {
        const error = new Error("date is required for custom transactions");
        error.status = 400;
        throw error;
    }

    if (status && !ALLOWED_STATUS.includes(status)) {
        const error = new Error("status must be either active or undone");
        error.status = 400;
        throw error;
    }

    const categoryDoc = await resolveCategoryForCreation({
        user,
        type,
        category,
        categoryId,
    });

    const finalDescription = description ?? note ?? undefined;
    const customDate = date ? normalizeToUtcMidnight(date) : undefined;

    const transaction = await Transaction.create({
        user: user._id,
        title: title?.trim() || categoryDoc?.name || type,
        description: finalDescription,
        type,
        category: categoryDoc.name,
        categoryId: categoryDoc._id,
        amount: numericAmount,
        ...(customDate ? { date: customDate } : {}),
        status: status || "active",
        isCustomDate: Boolean(customDate),
    });

    return { transaction: buildTransactionResponse(transaction) };
};

export const getTransactions = async (user, queryParams) => {
    const {
        status,
        startDate,
        endDate,
        type,
        category,
        sortBy = "date",
        sortDir = "desc",
    } = queryParams || {};

    const page = Number(queryParams.page);
    const pageSize = Number(queryParams.pageSize);

    const filter = { user: user._id };

    if (status) {
        if (!ALLOWED_STATUS.includes(status)) {
            const error = new Error("status must be either active or undone");
            error.status = 400;
            throw error;
        }
        filter.status = status;
    }

    if (type) {
        if (!ALLOWED_TYPES.includes(type)) {
            const error = new Error("type must be either income or expense");
            error.status = 400;
            throw error;
        }
        filter.type = type;
    }

    if (startDate || endDate) {
        filter.date = {};
        if (startDate) {
            filter.date.$gte = normalizeToUtcMidnight(startDate);
        }
        if (endDate) {
            const end = normalizeToUtcMidnight(endDate);
            end.setUTCHours(23, 59, 59, 999);
            filter.date.$lte = end;
        }
    }

    if (category) {
        filter.category = { $regex: category.trim(), $options: "i" };
    }

    const sortFieldMap = {
        date: "date",
        amount: "amount",
        category: "category",
    };

    const normalizedSortField = sortFieldMap[sortBy] || "date";
    const normalizedSortDir = sortDir === "asc" ? 1 : -1;
    const sort = { [normalizedSortField]: normalizedSortDir, createdAt: -1 };

    const usePagination = Number.isInteger(page) && page > 0 && Number.isInteger(pageSize) && pageSize > 0;
    let total = 0;

    if (usePagination) {
        total = await Transaction.countDocuments(filter);
    }

    const query = Transaction.find(filter).sort(sort).lean();

    if (usePagination) {
        query.skip((page - 1) * pageSize).limit(pageSize);
    }

    const transactions = await query;

    const mapped = transactions.map((transaction) => buildTransactionResponse(transaction));

    if (usePagination) {
        return { transactions: mapped, total, page, pageSize };
    }

    return { transactions: mapped };
};

const summaryPipeline = (userId) => [
    { $match: { user: new mongoose.Types.ObjectId(userId), status: "active" } },
    {
        $facet: {
            totals: [
                {
                    $group: {
                        _id: "$type",
                        total: { $sum: "$amount" },
                    },
                },
            ],
            monthly: [
                {
                    $group: {
                        _id: {
                            $dateToString: { format: "%Y-%m", date: "$date" },
                        },
                        income: {
                            $sum: {
                                $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
                            },
                        },
                        expense: {
                            $sum: {
                                $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
                            },
                        },
                    },
                },
                { $sort: { _id: -1 } },
                { $limit: 12 },
            ],
            weekly: [
                {
                    $group: {
                        _id: {
                            $dateToString: { format: "%G-W%V", date: "$date" },
                        },
                        income: {
                            $sum: {
                                $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
                            },
                        },
                        expense: {
                            $sum: {
                                $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
                            },
                        },
                    },
                },
                { $sort: { _id: -1 } },
                { $limit: 12 },
            ],
            yearly: [
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y", date: "$date" } },
                        income: {
                            $sum: {
                                $cond: [{ $eq: ["$type", "income"] }, "$amount", 0],
                            },
                        },
                        expense: {
                            $sum: {
                                $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0],
                            },
                        },
                    },
                },
                { $sort: { _id: -1 } },
                { $limit: 5 },
            ],
        },
    },
];

export const getSummary = async (user) => {
    const [result] = await Transaction.aggregate(summaryPipeline(user._id));

    const totalIncome =
        result?.totals?.find((entry) => entry._id === "income")?.total || 0;
    const totalExpense =
        result?.totals?.find((entry) => entry._id === "expense")?.total || 0;

    const formatEntry = (entry, key) => ({
        [key]: entry._id,
        income: entry.income,
        expense: entry.expense,
    });

    return {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        monthlySummary: result?.monthly?.map((entry) => formatEntry(entry, "month")) || [],
        weeklySummary: result?.weekly?.map((entry) => formatEntry(entry, "week")) || [],
        yearlySummary:
            result?.yearly?.map((entry) => ({
                year: Number(entry._id),
                income: entry.income,
                expense: entry.expense,
            })) || [],
    };
};

export const updateTransaction = async (user, id, updates) => {
    const transaction = await Transaction.findOne({ _id: id, user: user._id });
    if (!transaction) {
        const error = new Error("Transaction not found");
        error.status = 404;
        throw error;
    }

    if (updates.type && !ALLOWED_TYPES.includes(updates.type)) {
        const error = new Error("type must be either income or expense");
        error.status = 400;
        throw error;
    }

    const needsCategoryResolution =
        updates.category !== undefined ||
        updates.categoryId !== undefined ||
        updates.type !== undefined;

    if (needsCategoryResolution) {
        const { categoryId: resolvedCategoryId, categoryName: providedCategoryName } =
            deriveCategoryLookup({
                category: updates.category,
                categoryId: updates.categoryId,
            });

        const categoryNameForLookup =
            resolvedCategoryId ? undefined : providedCategoryName || transaction.category;

        const categoryDoc = await resolveCategory({
            userId: user._id,
            type: updates.type || transaction.type,
            categoryName: categoryNameForLookup,
            categoryId: resolvedCategoryId,
        });

        transaction.category = categoryDoc.name;
        transaction.categoryId = categoryDoc._id;
    }

    if (updates.title !== undefined) {
        transaction.title = updates.title?.trim() || transaction.category;
    }

    if (updates.description !== undefined || updates.note !== undefined) {
        const newDescription = updates.description ?? updates.note ?? "";
        transaction.description = newDescription;
    }

    if (updates.type) {
        transaction.type = updates.type;
    }

    if (updates.amount !== undefined) {
        const numericAmount = Number(updates.amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            const error = new Error("amount must be a positive number");
            error.status = 400;
            throw error;
        }
        transaction.amount = numericAmount;
    }

    if (updates.date) {
        const newDate = normalizeToUtcMidnight(updates.date);
        transaction.date = newDate;
        transaction.isCustomDate = true;
    } else if (updates.isCustomDate === false) {
        transaction.isCustomDate = false;
        transaction.date = new Date();
    }

    if (updates.status) {
        if (!ALLOWED_STATUS.includes(updates.status)) {
            const error = new Error("status must be either active or undone");
            error.status = 400;
            throw error;
        }
        transaction.status = updates.status;
    }

    await transaction.save();

    return { transaction: buildTransactionResponse(transaction) };
};

export const deleteTransaction = async (user, id, timeZone) => {
    const transaction = await Transaction.findById(id);
    if (!transaction) {
        const error = new Error("Transaction not found");
        error.status = 404;
        throw error;
    }

    if (String(transaction.user) !== String(user._id)) {
        const error = new Error("You are not allowed to delete this transaction");
        error.status = 403;
        throw error;
    }

    if (!timeZone) {
        const error = new Error("timezone is required");
        error.status = 400;
        throw error;
    }

    if (!isValidTimeZone(timeZone)) {
        const error = new Error("timezone must be a valid IANA time zone, e.g. America/New_York");
        error.status = 400;
        throw error;
    }

    // Compare the business date (transaction.date) with "today" in the user's timezone.
    // Only the calendar date (YYYY-MM-DD) is used for this comparison.
    const transactionDateKey = getLocalDateKey(transaction.date, timeZone);
    const todayDateKey = getLocalDateKey(new Date(), timeZone);

    if (transactionDateKey !== todayDateKey) {
        const error = new Error("Transaction date must be today in your timezone to be deleted.");
        error.status = 409;
        throw error;
    }

    await transaction.deleteOne();
    return true;
};

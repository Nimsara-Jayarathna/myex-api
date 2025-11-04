import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import { asyncHandler } from "../utils/errorHandler.js";

const ALLOWED_TYPES = ["income", "expense"];
const ALLOWED_STATUS = ["active", "undone"];

const normalizeCategoryName = (category) => category?.trim();

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

const buildTransactionResponse = (transaction) => ({
  id: transaction._id,
  user: transaction.user,
  title: transaction.title,
  description: transaction.description,
  type: transaction.type,
  category: transaction.category,
  categoryId: transaction.categoryId,
  amount: transaction.amount,
  date: transaction.date,
  status: transaction.status,
  createdAt: transaction.createdAt,
  updatedAt: transaction.updatedAt,
});

export const createTransaction = asyncHandler(async (req, res) => {
  const {
    title,
    type,
    amount,
    category,
    categoryId,
    date,
    description,
    status,
  } = req.body || {};

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

  if (status && !ALLOWED_STATUS.includes(status)) {
    const error = new Error("status must be either active or undone");
    error.status = 400;
    throw error;
  }

  const fallbackCategoryName =
    category ||
    (type === "income"
      ? req.user.defaultIncomeCategories?.[0]
      : req.user.defaultExpenseCategories?.[0]);

  if (!categoryId && !fallbackCategoryName) {
    const error = new Error("category is required");
    error.status = 400;
    throw error;
  }

  const categoryDoc = await resolveCategory({
    userId: req.user._id,
    type,
    categoryName: fallbackCategoryName,
    categoryId,
  });

  let transactionDate = date ? new Date(date) : new Date();
  if (Number.isNaN(transactionDate.getTime())) {
    const error = new Error("date is invalid");
    error.status = 400;
    throw error;
  }

  const transaction = await Transaction.create({
    user: req.user._id,
    title: title?.trim() || categoryDoc?.name || type,
    description,
    type,
    category: categoryDoc?.name || category,
    categoryId: categoryDoc?._id,
    amount: numericAmount,
    date: transactionDate,
    status: status || "active",
  });

  res.status(201).json({ transaction: buildTransactionResponse(transaction) });
});

export const getTransactions = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { user: req.user._id };

  if (status) {
    filter.status = status;
  }

  const transactions = await Transaction.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .lean();

  res.json({
    transactions: transactions.map((transaction) => ({
      id: transaction._id,
      user: transaction.user,
      title: transaction.title,
      description: transaction.description,
      type: transaction.type,
      category: transaction.category,
      categoryId: transaction.categoryId,
      amount: transaction.amount,
      date: transaction.date,
      status: transaction.status,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    })),
  });
});

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

export const getSummary = asyncHandler(async (req, res) => {
  const [result] = await Transaction.aggregate(summaryPipeline(req.user._id));

  const totalIncome =
    result?.totals?.find((entry) => entry._id === "income")?.total || 0;
  const totalExpense =
    result?.totals?.find((entry) => entry._id === "expense")?.total || 0;

  const formatEntry = (entry, key) => ({
    [key]: entry._id,
    income: entry.income,
    expense: entry.expense,
  });

  res.json({
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
  });
});

export const updateTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body || {};

  const transaction = await Transaction.findOne({ _id: id, user: req.user._id });
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

  if (updates.category || updates.type) {
    const categoryDoc = await resolveCategory(
      {
        userId: req.user._id,
        type: updates.type || transaction.type,
        categoryName: updates.category || transaction.category,
        categoryId: updates.categoryId,
      }
    );
    transaction.category = categoryDoc?.name || transaction.category;
    transaction.categoryId = categoryDoc?._id;
  }

  if (updates.title !== undefined) {
    transaction.title = updates.title?.trim() || transaction.category;
  }

  if (updates.description !== undefined) {
    transaction.description = updates.description;
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
    const newDate = new Date(updates.date);
    if (Number.isNaN(newDate.getTime())) {
      const error = new Error("date is invalid");
      error.status = 400;
      throw error;
    }
    transaction.date = newDate;
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

  res.json({ transaction: buildTransactionResponse(transaction) });
});

export const deleteTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await Transaction.deleteOne({ _id: id, user: req.user._id });
  if (result.deletedCount === 0) {
    const error = new Error("Transaction not found");
    error.status = 404;
    throw error;
  }

  res.status(204).send();
});

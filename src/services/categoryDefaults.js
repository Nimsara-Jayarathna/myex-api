import AdminCategoryPolicy from "../models/AdminCategoryPolicy.js";
import Category from "../models/Category.js";

const FALLBACKS = {
  income: "General Income",
  expense: "Miscellaneous Expense",
  limit: 10,
};

const ensureGlobalPolicy = async () => {
  let policy = await AdminCategoryPolicy.findOne({ scope: "global" });
  if (!policy) {
    policy = await AdminCategoryPolicy.create({
      scope: "global",
      defaultIncomeCategoryName: FALLBACKS.income,
      defaultExpenseCategoryName: FALLBACKS.expense,
      defaultCategoryLimit: FALLBACKS.limit,
    });
  }
  return policy;
};

const ensureGlobalDefaultCategory = async (type, name) => {
  let category = await Category.findOne({ user: null, type, name });
  if (!category) {
    category = await Category.create({ user: null, type, name, isDefault: true, isActive: true });
  } else {
    if (!category.isActive) category.isActive = true;
    category.isDefault = true;
    await category.save();
  }

  await Category.updateMany(
    { user: null, type, isDefault: true, _id: { $ne: category._id } },
    { $set: { isDefault: false } }
  );
};

export const getCategoryRegistrationDefaults = async () => {
  const policy = await ensureGlobalPolicy();

  const incomeName = policy.defaultIncomeCategoryName || FALLBACKS.income;
  const expenseName = policy.defaultExpenseCategoryName || FALLBACKS.expense;

  await ensureGlobalDefaultCategory("income", incomeName);
  await ensureGlobalDefaultCategory("expense", expenseName);

  return {
    incomeName,
    expenseName,
    categoryLimit: policy.defaultCategoryLimit || FALLBACKS.limit,
  };
};

export const ensureUserDefaultCategories = async (userId, incomeName, expenseName) => {
  const defaults = [
    { name: incomeName, type: "income" },
    { name: expenseName, type: "expense" },
  ];

  await Promise.all(
    defaults.map((entry) =>
      Category.findOneAndUpdate(
        { user: userId, name: entry.name, type: entry.type },
        { $setOnInsert: { isDefault: true }, $set: { isActive: true } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    )
  );
};

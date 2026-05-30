import AdminCategoryPolicy from "../../../../models/AdminCategoryPolicy.js";
import Category from "../../../../models/Category.js";

const ALLOWED_TYPES = new Set(["income", "expense"]);
const ALLOWED_STATUS = new Set(["ALL", "DEFAULT", "STANDARD"]);

const normalizeName = (value) => (typeof value === "string" ? value.trim() : "");

const mapCategory = (category) => ({
  id: category._id.toString(),
  name: category.name,
  type: category.type,
  isDefault: Boolean(category.isDefault),
  isActive: Boolean(category.isActive),
  status: category.isDefault ? "DEFAULT" : "STANDARD",
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});

const ensurePolicy = async () => {
  let policy = await AdminCategoryPolicy.findOne({ scope: "global" });
  if (!policy) {
    policy = await AdminCategoryPolicy.create({ scope: "global" });
  }
  return policy;
};

const findGlobalCategoryByName = async (name, type, excludeId) => {
  const query = {
    user: null,
    type,
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  return Category.findOne(query);
};

const ensureGlobalDefaults = async (policy) => {
  const ensureDefaultByType = async (type, name) => {
    let doc = await Category.findOne({ user: null, type, name }).sort({ createdAt: 1 });
    if (!doc) {
      doc = await Category.create({ user: null, type, name, isDefault: true, isActive: true });
    }

    if (!doc.isActive) {
      doc.isActive = true;
    }
    doc.isDefault = true;
    await doc.save();

    await Category.updateMany(
      { user: null, type, _id: { $ne: doc._id }, isDefault: true },
      { $set: { isDefault: false } }
    );
  };

  await ensureDefaultByType("income", policy.defaultIncomeCategoryName);
  await ensureDefaultByType("expense", policy.defaultExpenseCategoryName);
};

export const parseAdminCategoriesQuery = ({ search, type, status }) => {
  const parsed = {
    search: typeof search === "string" ? search.trim() : "",
    type: typeof type === "string" ? type.trim().toLowerCase() : "all",
    status: typeof status === "string" ? status.trim().toUpperCase() : "ALL",
  };

  if (parsed.type !== "all" && !ALLOWED_TYPES.has(parsed.type)) {
    const error = new Error("Invalid type. Allowed values: income, expense.");
    error.status = 400;
    error.details = { type: ["Allowed values are income and expense."] };
    throw error;
  }

  if (!ALLOWED_STATUS.has(parsed.status)) {
    const error = new Error("Invalid status. Allowed values: ALL, DEFAULT, STANDARD.");
    error.status = 400;
    error.details = { status: ["Allowed values are ALL, DEFAULT, STANDARD."] };
    throw error;
  }

  return parsed;
};

export const listAdminCategories = async ({ search, type, status }) => {
  const policy = await ensurePolicy();
  await ensureGlobalDefaults(policy);

  const filter = { user: null, isActive: true };
  if (type !== "all") {
    filter.type = type;
  }
  if (status === "DEFAULT") {
    filter.isDefault = true;
  } else if (status === "STANDARD") {
    filter.isDefault = false;
  }
  if (search) {
    filter.name = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }

  const categories = await Category.find(filter).sort({ type: 1, isDefault: -1, name: 1 }).lean();

  const defaultIncome = await Category.findOne({ user: null, type: "income", isDefault: true, isActive: true })
    .sort({ updatedAt: -1 })
    .lean();
  const defaultExpense = await Category.findOne({ user: null, type: "expense", isDefault: true, isActive: true })
    .sort({ updatedAt: -1 })
    .lean();

  return {
    defaults: {
      income: defaultIncome ? mapCategory(defaultIncome) : null,
      expense: defaultExpense ? mapCategory(defaultExpense) : null,
    },
    settings: {
      defaultCategoryLimit: policy.defaultCategoryLimit,
    },
    categories: categories.map(mapCategory),
    total: categories.length,
  };
};

export const createAdminCategory = async (payload = {}, actor = null) => {
  const name = normalizeName(payload.name);
  const type = typeof payload.type === "string" ? payload.type.trim().toLowerCase() : "";
  const setAsDefault = Boolean(payload.setAsDefault);

  if (!name) {
    const error = new Error("Category name is required.");
    error.status = 400;
    error.details = { name: ["Category name is required."] };
    throw error;
  }
  if (!ALLOWED_TYPES.has(type)) {
    const error = new Error("Category type must be income or expense.");
    error.status = 400;
    error.details = { type: ["Allowed values are income and expense."] };
    throw error;
  }

  const policy = await ensurePolicy();
  const existing = await findGlobalCategoryByName(name, type);
  if (existing && existing.isActive) {
    const error = new Error("Category already exists.");
    error.status = 409;
    error.details = { name: ["Category already exists."] };
    throw error;
  }

  const category =
    existing ||
    new Category({
      user: null,
      name,
      type,
      isActive: true,
      isDefault: false,
    });

  category.name = name;
  category.type = type;
  category.isActive = true;

  if (setAsDefault) {
    await Category.updateMany(
      { user: null, type, isDefault: true, _id: { $ne: category._id } },
      { $set: { isDefault: false } }
    );
    category.isDefault = true;
    if (type === "income") {
      policy.defaultIncomeCategoryName = name;
    } else {
      policy.defaultExpenseCategoryName = name;
    }
    policy.updatedBy = actor;
    await policy.save();
  }

  await category.save();
  return mapCategory(category);
};

export const updateAdminCategory = async (categoryId, payload = {}, actor = null) => {
  const category = await Category.findOne({ _id: categoryId, user: null, isActive: true });
  if (!category) {
    const error = new Error("Category not found.");
    error.status = 404;
    throw error;
  }

  const nextName = payload.name !== undefined ? normalizeName(payload.name) : category.name;
  const nextType = payload.type !== undefined ? String(payload.type).trim().toLowerCase() : category.type;
  const setAsDefault = payload.setAsDefault === true;

  if (!nextName) {
    const error = new Error("Category name is required.");
    error.status = 400;
    error.details = { name: ["Category name is required."] };
    throw error;
  }
  if (!ALLOWED_TYPES.has(nextType)) {
    const error = new Error("Category type must be income or expense.");
    error.status = 400;
    error.details = { type: ["Allowed values are income and expense."] };
    throw error;
  }

  const duplicate = await findGlobalCategoryByName(nextName, nextType, category._id);
  if (duplicate && duplicate.isActive) {
    const error = new Error("Category already exists.");
    error.status = 409;
    error.details = { name: ["Category already exists."] };
    throw error;
  }

  const wasDefault = category.isDefault;
  const previousType = category.type;

  category.name = nextName;
  category.type = nextType;

  const policy = await ensurePolicy();
  if (setAsDefault || wasDefault) {
    await Category.updateMany(
      { user: null, type: nextType, isDefault: true, _id: { $ne: category._id } },
      { $set: { isDefault: false } }
    );
    category.isDefault = true;
    if (nextType === "income") {
      policy.defaultIncomeCategoryName = nextName;
    } else {
      policy.defaultExpenseCategoryName = nextName;
    }
    if (wasDefault && previousType !== nextType) {
      await Category.updateMany(
        { user: null, type: previousType, isDefault: true },
        { $set: { isDefault: false } }
      );
    }
    policy.updatedBy = actor;
    await policy.save();
  }

  await category.save();
  return mapCategory(category);
};

export const setAdminDefaultCategory = async (categoryId, actor = null) => {
  const category = await Category.findOne({ _id: categoryId, user: null, isActive: true });
  if (!category) {
    const error = new Error("Category not found.");
    error.status = 404;
    throw error;
  }

  await Category.updateMany(
    { user: null, type: category.type, isDefault: true, _id: { $ne: category._id } },
    { $set: { isDefault: false } }
  );
  category.isDefault = true;
  await category.save();

  const policy = await ensurePolicy();
  if (category.type === "income") {
    policy.defaultIncomeCategoryName = category.name;
  } else {
    policy.defaultExpenseCategoryName = category.name;
  }
  policy.updatedBy = actor;
  await policy.save();

  return mapCategory(category);
};

export const deleteAdminCategory = async (categoryId) => {
  const category = await Category.findOne({ _id: categoryId, user: null, isActive: true });
  if (!category) {
    const error = new Error("Category not found.");
    error.status = 404;
    throw error;
  }
  if (category.isDefault) {
    const error = new Error("Default categories cannot be deleted.");
    error.status = 400;
    throw error;
  }

  category.isActive = false;
  category.isDefault = false;
  await category.save();
  return { id: category._id.toString(), deleted: true };
};

export const updateAdminCategoryLimit = async (limit, actor = null) => {
  const parsed = Number(limit);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) {
    const error = new Error("Invalid category limit. Must be an integer between 1 and 1000.");
    error.status = 400;
    error.details = { defaultCategoryLimit: ["Must be an integer between 1 and 1000."] };
    throw error;
  }

  const policy = await ensurePolicy();
  policy.defaultCategoryLimit = parsed;
  policy.updatedBy = actor;
  await policy.save();
  return { defaultCategoryLimit: policy.defaultCategoryLimit };
};

export const getRegistrationDefaults = async () => {
  const policy = await ensurePolicy();
  await ensureGlobalDefaults(policy);
  return {
    defaultIncomeCategoryName: policy.defaultIncomeCategoryName,
    defaultExpenseCategoryName: policy.defaultExpenseCategoryName,
    defaultCategoryLimit: policy.defaultCategoryLimit,
  };
};

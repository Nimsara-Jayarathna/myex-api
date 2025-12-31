import Category from "../models/Category.js";
import { asyncHandler } from "../utils/errorHandler.js";

const ALLOWED_TYPES = ["income", "expense"];

const normalizeName = (name = "") => name.trim();

const buildCategoryResponse = (category) => ({
  id: category._id,
  name: category.name,
  type: category.type,
  isDefault: category.isDefault,
  isActive: category.isActive,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
  isGlobal: !category.user,
});

const getLimitForUser = (user) => user?.categoryLimit ?? 10;

export const listActiveCategories = asyncHandler(async (req, res) => {
  const { type } = req.query;

  if (type && !ALLOWED_TYPES.includes(type)) {
    const error = new Error("type must be either income or expense");
    error.status = 400;
    throw error;
  }

  const filter = {
    isActive: true,
    $or: [{ user: req.user._id }, { user: null }],
  };

  if (type) {
    filter.type = type;
  }

  const categories = await Category.find(filter).sort({
    type: 1,
    isDefault: -1,
    name: 1,
  });

  res.json({
    categories: categories.map(buildCategoryResponse),
    limit: getLimitForUser(req.user),
  });
});

export const listAllCategories = asyncHandler(async (req, res) => {
  const { type } = req.query;

  if (type && !ALLOWED_TYPES.includes(type)) {
    const error = new Error("type must be either income or expense");
    error.status = 400;
    throw error;
  }

  const filter = {
    $or: [{ user: req.user._id }, { user: null }],
  };

  if (type) {
    filter.type = type;
  }

  const categories = await Category.find(filter).sort({
    type: 1,
    isDefault: -1,
    isActive: -1,
    name: 1,
  });

  res.json({
    categories: categories.map(buildCategoryResponse),
    limit: getLimitForUser(req.user),
  });
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, type } = req.body || {};

  const normalizedName = normalizeName(name);
  if (!normalizedName) {
    const error = new Error("name is required");
    error.status = 400;
    throw error;
  }

  if (!type || !ALLOWED_TYPES.includes(type)) {
    const error = new Error("type must be either income or expense");
    error.status = 400;
    throw error;
  }

  const existing = await Category.findOne({
    user: req.user._id,
    type,
    name: normalizedName,
  });

  const limit = getLimitForUser(req.user);

  if (existing) {
    if (existing.isActive) {
      const error = new Error("Category already exists");
      error.status = 409;
      throw error;
    }

    const activeCount = await Category.countDocuments({
      type,
      isActive: true,
      $or: [{ user: req.user._id }, { user: null }],
    });

    if (activeCount >= limit) {
      const error = new Error(`Category limit of ${limit} reached`);
      error.status = 400;
      throw error;
    }

    existing.isActive = true;
    await existing.save();

    res.status(200).json({ category: buildCategoryResponse(existing), reactivated: true });
    return;
  }

  const activeCount = await Category.countDocuments({
    type,
    isActive: true,
    $or: [{ user: req.user._id }, { user: null }],
  });

  if (activeCount >= limit) {
    const error = new Error(`Category limit of ${limit} reached`);
    error.status = 400;
    throw error;
  }

  const category = await Category.create({
    user: req.user._id,
    type,
    name: normalizedName,
  });

  res.status(201).json({ category: buildCategoryResponse(category) });
});

export const setDefaultCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isDefault } = req.body || {};

  if (isDefault !== true) {
    const error = new Error("isDefault must be true to set the default category");
    error.status = 400;
    throw error;
  }

  const category = await Category.findOne({
    _id: id,
    user: req.user._id,
  });

  if (!category) {
    const error = new Error("Category not found");
    error.status = 404;
    throw error;
  }

  if (!category.isActive) {
    const error = new Error("Category is inactive");
    error.status = 400;
    throw error;
  }

  const currentDefaultName =
    category.type === "income"
      ? req.user.defaultIncomeCategories?.[0]
      : req.user.defaultExpenseCategories?.[0];

  const alreadyDefaultAndAligned = category.isDefault && currentDefaultName === category.name;

  if (!alreadyDefaultAndAligned) {
    await Category.updateMany(
      { user: req.user._id, type: category.type, isDefault: true, _id: { $ne: id } },
      { $set: { isDefault: false } }
    );

    if (!category.isDefault) {
      category.isDefault = true;
      await category.save();
    }
  }

  if (category.type === "income") {
    req.user.defaultIncomeCategories = [category.name];
  } else {
    req.user.defaultExpenseCategories = [category.name];
  }
  await req.user.save();

  res.json({
    category: buildCategoryResponse(category),
    defaults: {
      defaultIncomeCategories: req.user.defaultIncomeCategories,
      defaultExpenseCategories: req.user.defaultExpenseCategories,
    },
    unchanged: alreadyDefaultAndAligned,
  });
});

export const archiveCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const category = await Category.findOne({
    _id: id,
    user: req.user._id,
  });

  if (!category) {
    const error = new Error("Category not found");
    error.status = 404;
    throw error;
  }

  if (category.isDefault) {
    const error = new Error("Default categories cannot be removed");
    error.status = 400;
    throw error;
  }

  if (!category.isActive) {
    res.json({ category: buildCategoryResponse(category), archived: true });
    return;
  }

  category.isActive = false;
  await category.save();

  res.json({ category: buildCategoryResponse(category), archived: true });
});

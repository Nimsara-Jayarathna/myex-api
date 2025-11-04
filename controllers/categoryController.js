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
});

const getLimitForUser = (user) => user?.categoryLimit ?? 10;

export const listCategories = asyncHandler(async (req, res) => {
  const { type, includeInactive } = req.query;

  const filter = { user: req.user._id };
  if (type) {
    if (!ALLOWED_TYPES.includes(type)) {
      const error = new Error("type must be either income or expense");
      error.status = 400;
      throw error;
    }
    filter.type = type;
  }

  if (includeInactive !== "true") {
    filter.isActive = true;
  }

  const categories = await Category.find(filter).sort({ name: 1 });

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
      user: req.user._id,
      type,
      isDefault: false,
      isActive: true,
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
    user: req.user._id,
    type,
    isDefault: false,
    isActive: true,
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

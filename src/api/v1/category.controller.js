import { asyncHandler } from "../../utils/errorHandler.js";
import * as categoryService from "./services/category.service.js";

export const listActiveCategories = asyncHandler(async (req, res) => {
  const result = await categoryService.listActiveCategories(req.user, req.query.type);
  res.json(result);
});

export const listAllCategories = asyncHandler(async (req, res) => {
  const result = await categoryService.listAllCategories(req.user, req.query.type);
  res.json(result);
});

export const createCategory = asyncHandler(async (req, res) => {
  // Pass req.body directly to the service
  const result = await categoryService.createCategory(req.user, req.body);

  if (result.reactivated) {
    res.status(200).json(result);
  } else {
    res.status(201).json(result);
  }
});

export const setDefaultCategory = asyncHandler(async (req, res) => {
  const result = await categoryService.setDefaultCategory(req.user, req.params.id, req.body);
  res.json(result);
});

export const archiveCategory = asyncHandler(async (req, res) => {
  const result = await categoryService.archiveCategory(req.user, req.params.id);
  res.json(result);
});

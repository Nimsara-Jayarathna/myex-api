import { asyncHandler } from "../../utils/errorHandler.js";
import * as transactionService from "./services/transaction.service.js";

const getTimezoneFromRequest = (req) => {
  // 1) User profile setting, if available
  const userTz = req.user?.timezone;
  if (typeof userTz === "string" && userTz.trim()) {
    return userTz.trim();
  }

  // 2) Explicit timezone header(s)
  const headerTz =
    req.get("X-Timezone") ||
    req.get("x-timezone") ||
    req.get("X-User-Timezone") ||
    req.get("x-user-timezone");

  const bodyTz = req.body?.timezone;
  const queryTz = req.query?.timezone;

  const timezone = headerTz || bodyTz || queryTz;

  if (!timezone || typeof timezone !== "string") {
    return undefined;
  }

  const trimmed = timezone.trim();
  return trimmed || undefined;
};

export const createTransaction = asyncHandler(async (req, res) => {
  const result = await transactionService.createTransaction(req.user, req.body, false);
  res.status(201).json(result);
});

export const createTransactionWithCustomDate = asyncHandler(async (req, res) => {
  const result = await transactionService.createTransaction(req.user, req.body, true);
  res.status(201).json(result);
});

export const getTransactions = asyncHandler(async (req, res) => {
  const result = await transactionService.getTransactions(req.user, req.query);
  res.json(result);
});

export const getSummary = asyncHandler(async (req, res) => {
  const result = await transactionService.getSummary(req.user);
  res.json(result);
});

export const updateTransaction = asyncHandler(async (req, res) => {
  const result = await transactionService.updateTransaction(req.user, req.params.id, req.body);
  res.json(result);
});

export const deleteTransaction = asyncHandler(async (req, res) => {
  const timeZone = getTimezoneFromRequest(req);
  await transactionService.deleteTransaction(req.user, req.params.id, timeZone);
  res.status(204).send();
});

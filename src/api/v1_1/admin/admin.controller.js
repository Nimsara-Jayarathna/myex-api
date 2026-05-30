import { asyncHandler } from "../../../utils/errorHandler.js";
import { sendAdminSuccess } from "./utils/adminResponse.js";
import {
  getDashboardSnapshot,
  parseDashboardQuery,
} from "./services/adminDashboard.service.js";
import {
  adminForceLogoutUser,
  adminResetUserPassword,
  getAdminUserActivity,
  getAdminUserById,
  getAdminUsers,
  parseUsersQuery,
  updateAdminUserById,
} from "./services/adminUsers.service.js";
import {
  createAdminCurrency,
  getAdminCurrencies,
  getAdminCurrencyById,
  parseCurrenciesQuery,
  setAdminCurrencyDefault,
  toggleAdminCurrencyStatus,
  updateAdminCurrencyById,
} from "./services/adminCurrencies.service.js";
import {
  createAdminCategory,
  deleteAdminCategory,
  listAdminCategories,
  parseAdminCategoriesQuery,
  setAdminDefaultCategory,
  updateAdminCategory,
  updateAdminCategoryLimit,
} from "./services/adminCategories.service.js";
import {
  cancelAdminBackup,
  createAdminDeleteRequest,
  decideAdminDeleteRequest,
  getAdminBackupById,
  getAdminBackupDownloadFile,
  getAdminProviderUsageHistory,
  getAdminSystemSnapshot,
  listAdminDeleteRequests,
  parseDeleteRequestQuery,
  startAdminBackup,
} from "./services/adminSystem.service.js";
import {
  authenticateAdmin,
  cancelAdminOtpChallenge,
  clearAdminCookie,
  clearAdminOtpChallengeCookie,
  getAccessTokenTtlSeconds,
  getActiveAdminById,
  getAdminOtpChallengeStatus,
  getAdminTokenFromRequest,
  resendAdminOtpChallenge,
  setAdminCookie,
  setAdminOtpChallengeCookie,
  signAdminAccessToken,
  startAdminOtpChallenge,
  verifyAdminOtpChallenge,
  verifyAdminAccessToken,
} from "./services/adminAuth.service.js";
import { getClientIp } from "../../../utils/logger.js";

export const login = asyncHandler(async (req, res) => {
  const admin = await authenticateAdmin(req.body || {});
  const otpChallenge = await startAdminOtpChallenge(admin, {
    ip: getClientIp(req),
    userAgent: req.get("user-agent") || undefined,
  });
  setAdminOtpChallengeCookie(res, otpChallenge.challengeToken);
  clearAdminCookie(res);

  return sendAdminSuccess(
    req,
    res,
    {
      otpRequired: true,
      ...otpChallenge.status,
    },
    "Verification code sent to your email."
  );
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const result = await verifyAdminOtpChallenge({
    req,
    otp: req.body?.otp,
    requestMeta: {
      ip: getClientIp(req),
      userAgent: req.get("user-agent") || undefined,
    },
  });

  const token = signAdminAccessToken(result.admin);
  setAdminCookie(res, token);
  clearAdminOtpChallengeCookie(res);

  return sendAdminSuccess(
    req,
    res,
    {
      admin: result.admin,
      session: { accessTokenExpiresInSeconds: getAccessTokenTtlSeconds() },
    },
    "Verification successful."
  );
});

export const resendOtp = asyncHandler(async (req, res) => {
  const status = await resendAdminOtpChallenge({
    req,
    requestMeta: {
      ip: getClientIp(req),
      userAgent: req.get("user-agent") || undefined,
    },
  });

  return sendAdminSuccess(req, res, status, "Verification code resent.");
});

export const otpStatus = asyncHandler(async (req, res) => {
  const status = await getAdminOtpChallengeStatus(req);
  return sendAdminSuccess(req, res, status, "OTP challenge active.");
});

export const cancelOtp = asyncHandler(async (req, res) => {
  await cancelAdminOtpChallenge(req);
  clearAdminOtpChallengeCookie(res);
  return sendAdminSuccess(req, res, {}, "OTP challenge cancelled.");
});

export const session = asyncHandler(async (req, res) => {
  const token = getAdminTokenFromRequest(req);
  if (!token) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }

  let admin;
  try {
    const decoded = verifyAdminAccessToken(token);
    admin = await getActiveAdminById(decoded.id);
  } catch (_error) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }

  return sendAdminSuccess(
    req,
    res,
    {
      authenticated: true,
      admin,
      session: { accessTokenExpiresInSeconds: getAccessTokenTtlSeconds() },
    },
    "Session active."
  );
});

export const logout = asyncHandler(async (req, res) => {
  await cancelAdminOtpChallenge(req);
  clearAdminCookie(res);
  clearAdminOtpChallengeCookie(res);
  return sendAdminSuccess(req, res, {}, "Logged out successfully.");
});

export const dashboard = asyncHandler(async (req, res) => {
  const query = parseDashboardQuery(req.query || {});

  try {
    const snapshot = await getDashboardSnapshot(query);
    return sendAdminSuccess(req, res, snapshot, "Dashboard snapshot loaded.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to load dashboard snapshot.";
    }
    throw error;
  }
});

export const users = asyncHandler(async (req, res) => {
  const query = parseUsersQuery(req.query || {});

  try {
    const payload = await getAdminUsers(query);
    return sendAdminSuccess(req, res, payload, "Users loaded.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to load users.";
    }
    throw error;
  }
});

export const userById = asyncHandler(async (req, res) => {
  try {
    const payload = await getAdminUserById(req.params.id);
    return sendAdminSuccess(req, res, payload, "User loaded.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to load user.";
    }
    throw error;
  }
});

export const updateUser = asyncHandler(async (req, res) => {
  try {
    const payload = await updateAdminUserById(req.params.id, req.body || {});
    return sendAdminSuccess(req, res, payload, "User updated.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to update user.";
    }
    throw error;
  }
});

export const resetUserPassword = asyncHandler(async (req, res) => {
  try {
    const payload = await adminResetUserPassword(req.params.id);
    return sendAdminSuccess(
      req,
      res,
      payload,
      "Password reset completed and temporary password emailed."
    );
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to reset password.";
    }
    throw error;
  }
});

export const forceLogoutUser = asyncHandler(async (req, res) => {
  try {
    const payload = await adminForceLogoutUser(req.params.id);
    return sendAdminSuccess(req, res, payload, "User force logged out.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to force logout user.";
    }
    throw error;
  }
});

export const userActivity = asyncHandler(async (req, res) => {
  try {
    const payload = await getAdminUserActivity(req.params.id);
    return sendAdminSuccess(req, res, { activity: payload }, "User activity loaded.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to load user activity.";
    }
    throw error;
  }
});

export const currencies = asyncHandler(async (req, res) => {
  const query = parseCurrenciesQuery(req.query || {});
  try {
    const payload = await getAdminCurrencies(query);
    return sendAdminSuccess(req, res, payload, "Currencies loaded.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to load currencies.";
    }
    throw error;
  }
});

export const currencyById = asyncHandler(async (req, res) => {
  try {
    const payload = await getAdminCurrencyById(req.params.id);
    return sendAdminSuccess(req, res, payload, "Currency loaded.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to load currency.";
    }
    throw error;
  }
});

export const createCurrency = asyncHandler(async (req, res) => {
  try {
    const payload = await createAdminCurrency(req.body || {});
    return sendAdminSuccess(req, res, payload, "Currency created.", 201);
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to create currency.";
    }
    throw error;
  }
});

export const updateCurrency = asyncHandler(async (req, res) => {
  try {
    const payload = await updateAdminCurrencyById(req.params.id, req.body || {});
    return sendAdminSuccess(req, res, payload, "Currency updated.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to update currency.";
    }
    throw error;
  }
});

export const setCurrencyDefault = asyncHandler(async (req, res) => {
  try {
    const payload = await setAdminCurrencyDefault(req.params.id);
    return sendAdminSuccess(req, res, payload, "Default currency updated.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to set default currency.";
    }
    throw error;
  }
});

export const toggleCurrencyStatus = asyncHandler(async (req, res) => {
  try {
    const payload = await toggleAdminCurrencyStatus(req.params.id, req.body?.isActive);
    return sendAdminSuccess(req, res, payload, "Currency status updated.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to update currency status.";
    }
    throw error;
  }
});

export const categories = asyncHandler(async (req, res) => {
  const query = parseAdminCategoriesQuery(req.query || {});
  try {
    const payload = await listAdminCategories(query);
    return sendAdminSuccess(req, res, payload, "Categories loaded.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to load categories.";
    }
    throw error;
  }
});

export const createCategory = asyncHandler(async (req, res) => {
  try {
    const payload = await createAdminCategory(req.body || {}, req.admin?.email || null);
    return sendAdminSuccess(req, res, payload, "Category created.", 201);
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to create category.";
    }
    throw error;
  }
});

export const updateCategory = asyncHandler(async (req, res) => {
  try {
    const payload = await updateAdminCategory(req.params.id, req.body || {}, req.admin?.email || null);
    return sendAdminSuccess(req, res, payload, "Category updated.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to update category.";
    }
    throw error;
  }
});

export const setCategoryDefault = asyncHandler(async (req, res) => {
  try {
    const payload = await setAdminDefaultCategory(req.params.id, req.admin?.email || null);
    return sendAdminSuccess(req, res, payload, "Default category updated.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to update default category.";
    }
    throw error;
  }
});

export const deleteCategory = asyncHandler(async (req, res) => {
  try {
    const payload = await deleteAdminCategory(req.params.id);
    return sendAdminSuccess(req, res, payload, "Category deleted.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to delete category.";
    }
    throw error;
  }
});

export const updateCategorySettings = asyncHandler(async (req, res) => {
  try {
    const payload = await updateAdminCategoryLimit(req.body?.defaultCategoryLimit, req.admin?.email || null);
    return sendAdminSuccess(req, res, payload, "Category settings updated.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to update category settings.";
    }
    throw error;
  }
});

export const systemSnapshot = asyncHandler(async (req, res) => {
  try {
    const payload = await getAdminSystemSnapshot();
    return sendAdminSuccess(req, res, payload, "System snapshot loaded.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to load system snapshot.";
    }
    throw error;
  }
});

export const providerUsageHistory = asyncHandler(async (req, res) => {
  try {
    const payload = await getAdminProviderUsageHistory({ date: req.query?.date });
    return sendAdminSuccess(req, res, payload, "Provider usage history loaded.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to load provider usage history.";
    }
    throw error;
  }
});

export const runBackup = asyncHandler(async (req, res) => {
  try {
    const payload = await startAdminBackup(req.admin?.email || null, {
      simulateFailure: req.body?.simulateFailure,
    });
    return sendAdminSuccess(req, res, payload, "Backup started.", 201);
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to start backup.";
    }
    throw error;
  }
});

export const backupById = asyncHandler(async (req, res) => {
  try {
    const payload = await getAdminBackupById(req.params.id);
    return sendAdminSuccess(req, res, payload, "Backup status loaded.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to load backup status.";
    }
    throw error;
  }
});

export const downloadBackup = asyncHandler(async (req, res) => {
  try {
    const file = await getAdminBackupDownloadFile(req.params.id);
    return res.download(file.path, file.fileName);
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to download backup file.";
    }
    throw error;
  }
});

export const cancelBackup = asyncHandler(async (req, res) => {
  try {
    const payload = await cancelAdminBackup(req.params.id);
    return sendAdminSuccess(req, res, payload, "Backup canceled.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to cancel backup.";
    }
    throw error;
  }
});

export const deleteRequests = asyncHandler(async (req, res) => {
  const query = parseDeleteRequestQuery(req.query || {});
  try {
    const payload = await listAdminDeleteRequests(query);
    return sendAdminSuccess(req, res, payload, "Delete requests loaded.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to load delete requests.";
    }
    throw error;
  }
});

export const createDeleteRequest = asyncHandler(async (req, res) => {
  try {
    const payload = await createAdminDeleteRequest(req.body || {});
    return sendAdminSuccess(req, res, payload, "Delete request created.", 201);
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to create delete request.";
    }
    throw error;
  }
});

export const decideDeleteRequest = asyncHandler(async (req, res) => {
  try {
    const payload = await decideAdminDeleteRequest(req.params.id, req.body || {}, req.admin?.email || null);
    return sendAdminSuccess(req, res, payload, "Delete request decision saved.");
  } catch (error) {
    if (!error.status) {
      error.status = 500;
      error.message = "Unable to decide delete request.";
    }
    throw error;
  }
});

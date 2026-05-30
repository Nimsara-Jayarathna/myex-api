import mongoose from "mongoose";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Category from "../../../../models/Category.js";
import Currency from "../../../../models/Currency.js";
import Token from "../../../../models/Token.js";
import Transaction from "../../../../models/Transaction.js";
import User from "../../../../models/User.js";
import AdminBackupJob from "../../../../models/AdminBackupJob.js";
import AdminDeleteRequest from "../../../../models/AdminDeleteRequest.js";

const BACKUP_TOTAL_DURATION_MS = 24000;
const DAILY_PROVIDER_LIMIT = 300;
const DB_CAPACITY_GB = 5;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_BACKUP_STORAGE_DIR = path.resolve(__dirname, "../../../../../storage/backups");
const BACKUP_STORAGE_DIR = path.resolve(process.env.ADMIN_BACKUP_STORAGE_DIR || DEFAULT_BACKUP_STORAGE_DIR);

const round = (value, digits = 2) => Number(Number(value || 0).toFixed(digits));

const startOfDay = (date = new Date()) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date = new Date()) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const estimateBackupBytes = async () => {
  const [users, categories, transactions, currencies] = await Promise.all([
    User.countDocuments({}),
    Category.countDocuments({}),
    Transaction.countDocuments({}),
    Currency.countDocuments({}),
  ]);

  const estimatedMb = users * 0.004 + categories * 0.002 + transactions * 0.006 + currencies * 0.001 + 24;
  return Math.max(8 * 1024 * 1024, Math.round(estimatedMb * 1024 * 1024));
};

const backupStageByProgress = (progress) => {
  if (progress < 25) return "Preparing backup snapshot";
  if (progress < 50) return "Exporting database collections";
  if (progress < 75) return "Compressing backup archive";
  if (progress < 95) return "Uploading to remote storage";
  return "Finalizing backup";
};

const ensureBackupDirectory = async () => {
  await fs.mkdir(BACKUP_STORAGE_DIR, { recursive: true });
};

const buildBackupFileName = (date = new Date()) => {
  const stamp = date.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z");
  return `backup_production_${stamp}.sql`;
};

const createBackupArtifact = async (job) => {
  await ensureBackupDirectory();

  const [users, categories, transactions, currencies] = await Promise.all([
    User.countDocuments({}),
    Category.countDocuments({}),
    Transaction.countDocuments({}),
    Currency.countDocuments({}),
  ]);

  const generatedAt = new Date();
  const fileName = buildBackupFileName(generatedAt);
  const filePath = path.join(BACKUP_STORAGE_DIR, fileName);

  const lines = [
    "-- Blipzo Admin Manual Backup",
    `-- backupJobId: ${job._id.toString()}`,
    `-- generatedAt: ${generatedAt.toISOString()}`,
    `-- users: ${users}`,
    `-- categories: ${categories}`,
    `-- transactions: ${transactions}`,
    `-- currencies: ${currencies}`,
    "",
    "BEGIN TRANSACTION;",
    "-- This is a placeholder export file for admin download flow.",
    "-- Replace with mongodump/real snapshot pipeline in production.",
    "COMMIT;",
    "",
  ];

  await fs.writeFile(filePath, lines.join("\n"), "utf8");
  const stat = await fs.stat(filePath);

  return {
    fileName,
    storagePath: filePath,
    fileSizeBytes: stat.size,
  };
};

const refreshBackupJob = async (job) => {
  if (!job || job.status !== "running") {
    return job;
  }

  const elapsed = Date.now() - new Date(job.startedAt).getTime();
  const progress = Math.max(1, Math.min(100, Math.floor((elapsed / BACKUP_TOTAL_DURATION_MS) * 100)));

  if (elapsed >= BACKUP_TOTAL_DURATION_MS) {
    job.progress = 100;
    job.completedAt = new Date();

    if (job.shouldFail) {
      job.status = "failed";
      job.stage = "Backup failed";
      job.errorCode = "ERR_STORAGE_TIMEOUT_0x442";
      job.errorMessage = "Connection to storage bucket timed out.";
      job.fileName = null;
      job.storagePath = null;
      job.fileSizeBytes = null;
    } else {
      job.status = "success";
      job.stage = "Backup completed";
      job.errorCode = null;
      job.errorMessage = null;
      const artifact = await createBackupArtifact(job);
      job.fileName = artifact.fileName;
      job.storagePath = artifact.storagePath;
      job.fileSizeBytes = artifact.fileSizeBytes || (await estimateBackupBytes());
    }

    await job.save();
    return job;
  }

  const nextStage = backupStageByProgress(progress);
  if (job.progress !== progress || job.stage !== nextStage) {
    job.progress = progress;
    job.stage = nextStage;
    await job.save();
  }

  return job;
};

const refreshRunningBackups = async () => {
  const running = await AdminBackupJob.find({ status: "running" });
  await Promise.all(running.map((job) => refreshBackupJob(job)));
};

const normalizeBackup = (job) => ({
  id: job._id.toString(),
  status: job.status,
  progress: job.progress,
  stage: job.stage,
  target: job.target,
  startedAt: job.startedAt ? new Date(job.startedAt).toISOString() : null,
  completedAt: job.completedAt ? new Date(job.completedAt).toISOString() : null,
  fileName: job.fileName || null,
  hasDownload: Boolean(job.storagePath && job.status === "success"),
  fileSizeBytes: job.fileSizeBytes || null,
  errorCode: job.errorCode || null,
  errorMessage: job.errorMessage || null,
});

const normalizeDeleteRequest = (request) => ({
  id: request._id.toString(),
  userId: request.userId ? request.userId.toString() : null,
  userName: request.userName,
  userEmail: request.userEmail,
  status: request.status,
  reason: request.reason,
  requestedAt: request.requestedAt ? new Date(request.requestedAt).toISOString() : null,
  reviewedAt: request.reviewedAt ? new Date(request.reviewedAt).toISOString() : null,
  reviewedBy: request.reviewedBy || null,
  reviewNote: request.reviewNote || null,
});

const parseDateInput = (value) => {
  if (!value) return new Date();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error("Invalid date format.");
    error.status = 400;
    error.details = { date: ["Expected a valid ISO date string."] };
    throw error;
  }
  return parsed;
};

const getProviderDailyStats = async (dateInput = new Date()) => {
  const dayStart = startOfDay(dateInput);
  const dayEnd = endOfDay(dateInput);

  const sent = await Token.countDocuments({
    type: { $in: ["register_otp", "reset_token", "email_change_current", "email_change_new"] },
    createdAt: { $gte: dayStart, $lte: dayEnd },
  });

  const failed = 0;
  const usagePct = DAILY_PROVIDER_LIMIT === 0 ? 0 : Math.min(100, Math.round((sent / DAILY_PROVIDER_LIMIT) * 100));
  const successRate = sent === 0 ? 100 : round(((sent - failed) / sent) * 100, 1);

  return {
    date: dayStart.toISOString().slice(0, 10),
    sent,
    failed,
    limit: DAILY_PROVIDER_LIMIT,
    usagePct,
    successRate,
  };
};

const getHourlyDistribution = async (dateInput) => {
  const dayStart = startOfDay(dateInput);
  const dayEnd = endOfDay(dateInput);

  const rows = await Token.aggregate([
    {
      $match: {
        type: { $in: ["register_otp", "reset_token", "email_change_current", "email_change_new"] },
        createdAt: { $gte: dayStart, $lte: dayEnd },
      },
    },
    {
      $project: {
        hour: { $hour: "$createdAt" },
      },
    },
    {
      $group: {
        _id: "$hour",
        count: { $sum: 1 },
      },
    },
  ]);

  const byHour = new Map(rows.map((row) => [row._id, row.count]));
  return Array.from({ length: 24 }, (_, hour) => ({ hour, count: byHour.get(hour) || 0 }));
};

export const parseDeleteRequestQuery = ({ status }) => {
  const normalizedStatus = typeof status === "string" ? status.trim().toLowerCase() : "";
  const allowed = ["", "pending", "approved", "denied"];
  if (!allowed.includes(normalizedStatus)) {
    const error = new Error("Invalid status filter.");
    error.status = 400;
    error.details = { status: ["Allowed values are pending, approved, denied."] };
    throw error;
  }

  return { status: normalizedStatus || null };
};

export const getAdminSystemSnapshot = async () => {
  await refreshRunningBackups();

  const [users, categories, transactions, currencies, deleteRequests, pendingDeleteRequests, lastBackup, runningBackup, providerStats] =
    await Promise.all([
      User.countDocuments({}),
      Category.countDocuments({}),
      Transaction.countDocuments({}),
      Currency.countDocuments({}),
      AdminDeleteRequest.countDocuments({}),
      AdminDeleteRequest.countDocuments({ status: "pending" }),
      AdminBackupJob.findOne().sort({ startedAt: -1 }),
      AdminBackupJob.findOne({ status: "running" }).sort({ startedAt: -1 }),
      getProviderDailyStats(),
    ]);

  const dataSizeMb = users * 0.004 + categories * 0.002 + transactions * 0.006 + currencies * 0.001 + 24;
  const indexSizeMb = dataSizeMb * 0.35;
  const totalSizeGb = (dataSizeMb + indexSizeMb) / 1024;
  const usedPct = Math.min(100, Math.round((totalSizeGb / DB_CAPACITY_GB) * 100));

  return {
    providerHealth: {
      status: providerStats.failed > 0 ? "degraded" : "ok",
      sendRatePerDay: providerStats.limit,
      sentToday: providerStats.sent,
      failedToday: providerStats.failed,
      usagePct: providerStats.usagePct,
      successRate: providerStats.successRate,
    },
    dbHealth: {
      connected: mongoose.connection.readyState === 1,
      totalSizeGb: round(totalSizeGb, 2),
      dataSizeMb: round(dataSizeMb, 1),
      indexSizeMb: round(indexSizeMb, 1),
      capacityGb: DB_CAPACITY_GB,
      usedPct,
      remainingGb: round(DB_CAPACITY_GB - totalSizeGb, 2),
    },
    backup: {
      lastBackupAt: lastBackup?.completedAt ? new Date(lastBackup.completedAt).toISOString() : null,
      lastBackupStatus: lastBackup?.status || "never",
      target: (runningBackup || lastBackup)?.target || "remote_cloud_storage_node_01",
      runningJob: runningBackup ? normalizeBackup(runningBackup) : null,
      lastJobId: (runningBackup || lastBackup)?._id?.toString() || null,
    },
    deleteRequests: {
      total: deleteRequests,
      pending: pendingDeleteRequests,
    },
  };
};

export const getAdminProviderUsageHistory = async ({ date }) => {
  const selectedDate = parseDateInput(date);

  const dayItems = await Promise.all(
    Array.from({ length: 7 }, (_, index) => {
      const day = new Date(selectedDate);
      day.setDate(day.getDate() - (6 - index));
      return getProviderDailyStats(day);
    })
  );

  const selectedDay = dayItems[dayItems.length - 1];
  const hourlyDistribution = await getHourlyDistribution(selectedDate);

  return {
    selectedDate: selectedDay.date,
    summary: {
      sent: selectedDay.sent,
      limit: selectedDay.limit,
      usagePct: selectedDay.usagePct,
      successRate: selectedDay.successRate,
      failed: selectedDay.failed,
    },
    history: dayItems,
    hourlyDistribution,
    failedEvents: [],
  };
};

export const startAdminBackup = async (initiatedBy, { simulateFailure = false } = {}) => {
  await refreshRunningBackups();

  const active = await AdminBackupJob.findOne({ status: "running" });
  if (active) {
    const error = new Error("A backup process is already running.");
    error.status = 409;
    throw error;
  }

  const backup = await AdminBackupJob.create({
    status: "running",
    progress: 1,
    stage: "Preparing backup snapshot",
    target: "remote_cloud_storage_node_01",
    startedAt: new Date(),
    initiatedBy: initiatedBy || null,
    shouldFail: Boolean(simulateFailure),
  });

  return normalizeBackup(backup);
};

export const getAdminBackupById = async (backupId) => {
  const backup = await AdminBackupJob.findById(backupId);
  if (!backup) {
    const error = new Error("Backup job not found.");
    error.status = 404;
    throw error;
  }

  await refreshBackupJob(backup);
  return normalizeBackup(backup);
};

export const getAdminBackupDownloadFile = async (backupId) => {
  const backup = await AdminBackupJob.findById(backupId);
  if (!backup) {
    const error = new Error("Backup job not found.");
    error.status = 404;
    throw error;
  }

  if (backup.status !== "success" || !backup.storagePath || !backup.fileName) {
    const error = new Error("Backup file is not available for download.");
    error.status = 409;
    throw error;
  }

  try {
    await fs.access(backup.storagePath);
  } catch (_error) {
    const error = new Error("Backup file not found on storage.");
    error.status = 404;
    throw error;
  }

  return {
    path: backup.storagePath,
    fileName: backup.fileName,
  };
};

export const cancelAdminBackup = async (backupId) => {
  const backup = await AdminBackupJob.findById(backupId);
  if (!backup) {
    const error = new Error("Backup job not found.");
    error.status = 404;
    throw error;
  }

  if (backup.status !== "running") {
    const error = new Error("Only running backups can be canceled.");
    error.status = 400;
    throw error;
  }

  backup.status = "canceled";
  backup.stage = "Backup canceled";
  backup.progress = Math.max(backup.progress || 0, 1);
  backup.completedAt = new Date();
  await backup.save();

  return normalizeBackup(backup);
};

export const listAdminDeleteRequests = async ({ status }) => {
  const query = {};
  if (status) {
    query.status = status;
  }

  const requests = await AdminDeleteRequest.find(query)
    .sort({ requestedAt: -1 })
    .limit(100)
    .lean();

  const counts = await AdminDeleteRequest.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = { pending: 0, approved: 0, denied: 0, total: 0 };
  for (const row of counts) {
    summary[row._id] = row.count;
    summary.total += row.count;
  }

  return {
    requests: requests.map((request) => normalizeDeleteRequest(request)),
    summary,
  };
};

export const createAdminDeleteRequest = async ({ userId, reason }) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    const error = new Error("Invalid userId.");
    error.status = 400;
    error.details = { userId: ["A valid user id is required."] };
    throw error;
  }

  const user = await User.findById(userId).select("fname lname name email");
  if (!user) {
    const error = new Error("User not found.");
    error.status = 404;
    throw error;
  }

  const existingPending = await AdminDeleteRequest.findOne({ userId: user._id, status: "pending" });
  if (existingPending) {
    return normalizeDeleteRequest(existingPending);
  }

  const request = await AdminDeleteRequest.create({
    userId: user._id,
    userName: user.name || `${user.fname || ""} ${user.lname || ""}`.trim(),
    userEmail: user.email,
    reason: typeof reason === "string" && reason.trim() ? reason.trim() : "User requested account deletion.",
    requestedAt: new Date(),
    status: "pending",
  });

  return normalizeDeleteRequest(request);
};

export const decideAdminDeleteRequest = async (requestId, { decision, note }, reviewedBy) => {
  const normalizedDecision = typeof decision === "string" ? decision.trim().toLowerCase() : "";
  if (!["approve", "deny"].includes(normalizedDecision)) {
    const error = new Error("Invalid decision.");
    error.status = 400;
    error.details = { decision: ["Allowed values are approve or deny."] };
    throw error;
  }

  const request = await AdminDeleteRequest.findById(requestId);
  if (!request) {
    const error = new Error("Delete request not found.");
    error.status = 404;
    throw error;
  }

  if (request.status !== "pending") {
    return normalizeDeleteRequest(request);
  }

  if (normalizedDecision === "approve") {
    if (request.userId) {
      await Promise.all([
        Transaction.deleteMany({ user: request.userId }),
        Category.deleteMany({ user: request.userId }),
        Token.deleteMany({ $or: [{ userId: request.userId }, { email: request.userEmail }] }),
        User.deleteOne({ _id: request.userId }),
      ]);
    }
    request.status = "approved";
    request.userId = null;
  } else {
    request.status = "denied";
  }

  request.reviewedAt = new Date();
  request.reviewedBy = reviewedBy || null;
  request.reviewNote = typeof note === "string" && note.trim() ? note.trim() : null;

  await request.save();
  return normalizeDeleteRequest(request);
};

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import { notFound, errorHandler } from "./utils/errorHandler.js";
import {
  getClientIp,
  getDeviceInfo,
  hashEmail,
  logger,
} from "./utils/logger.js";

dotenv.config();

const app = express();

// Allow configuring CORS origins via comma-separated env var
const corsOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];

const corsOptions = {
  origin: corsOrigins.length > 0 ? corsOrigins : true,
  credentials: true, // enable cookie/auth headers
};

app.use(cors(corsOptions));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const clientIp = getClientIp(req);
    const userAgent = req.get("user-agent") || undefined;
    const deviceInfo = getDeviceInfo(req);
    const userEmailHash =
      res.locals.userEmailHash || (req.user?.email ? hashEmail(req.user.email) : undefined);
    const logLevel =
      res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    logger[logLevel]({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(1)),
      clientIp,
      userEmailHash,
      deviceType: deviceInfo.deviceType,
      deviceModel: deviceInfo.deviceModel,
      os: deviceInfo.os,
      browser: deviceInfo.browser,
      appVersion: deviceInfo.appVersion,
      userAgent,
      errorMessage: res.locals.errorMessage,
    });
  });
  next();
});

app.get("/", (req, res) => {
  res.send("Blipzo API is running.");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/categories", categoryRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

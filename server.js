import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import { notFound, errorHandler } from "./utils/errorHandler.js";

dotenv.config();

const app = express();

const ipDetailsCache = new Map();

const isPrivateIp = (ip) => {
  if (!ip) return true;
  const normalized = ip.replace(/^::ffff:/, "");
  return (
    normalized === "::1" ||
    normalized === "127.0.0.1" ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized) ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
};

const fetchIpDetails = async (ip) => {
  const normalized = ip.replace(/^::ffff:/, "");
  if (isPrivateIp(normalized)) {
    return { country: "private", region: "private", isp: "private" };
  }
  if (ipDetailsCache.has(normalized)) {
    return ipDetailsCache.get(normalized);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);
  try {
    const url =
      `http://ip-api.com/json/${encodeURIComponent(normalized)}` +
      "?fields=status,country,regionName,isp";
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json();
    if (data.status !== "success") {
      return { country: "unknown", region: "unknown", isp: "unknown" };
    }
    const details = {
      country: data.country || "unknown",
      region: data.regionName || "unknown",
      isp: data.isp || "unknown",
    };
    ipDetailsCache.set(normalized, details);
    return details;
  } catch (error) {
    return { country: "unknown", region: "unknown", isp: "unknown" };
  } finally {
    clearTimeout(timeoutId);
  }
};

const parseUserAgent = (userAgent) => {
  const ua = userAgent || "";
  const lower = ua.toLowerCase();

  let osName = "unknown";
  let osVersion = "unknown";
  if (/android/i.test(ua)) {
    osName = "Android";
    const match = ua.match(/Android\s([0-9.]+)/i);
    if (match) osVersion = match[1];
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    osName = "iOS";
    const match = ua.match(/OS\s([0-9_]+)/i);
    if (match) osVersion = match[1].replace(/_/g, ".");
  } else if (/Windows NT/i.test(ua)) {
    osName = "Windows";
    const match = ua.match(/Windows NT\s([0-9.]+)/i);
    if (match) osVersion = match[1];
  } else if (/Mac OS X/i.test(ua)) {
    osName = "macOS";
    const match = ua.match(/Mac OS X\s([0-9_]+)/i);
    if (match) osVersion = match[1].replace(/_/g, ".");
  } else if (/Linux/i.test(ua)) {
    osName = "Linux";
    osVersion = "unknown";
  }

  let browserName = "unknown";
  let browserVersion = "unknown";
  if (/Edg\//i.test(ua)) {
    browserName = "Edge";
    const match = ua.match(/Edg\/([0-9.]+)/i);
    if (match) browserVersion = match[1];
  } else if (/OPR\//i.test(ua)) {
    browserName = "Opera";
    const match = ua.match(/OPR\/([0-9.]+)/i);
    if (match) browserVersion = match[1];
  } else if (/Chrome\//i.test(ua)) {
    browserName = "Chrome";
    const match = ua.match(/Chrome\/([0-9.]+)/i);
    if (match) browserVersion = match[1];
  } else if (/Firefox\//i.test(ua)) {
    browserName = "Firefox";
    const match = ua.match(/Firefox\/([0-9.]+)/i);
    if (match) browserVersion = match[1];
  } else if (/Safari\//i.test(ua)) {
    browserName = "Safari";
    const match = ua.match(/Version\/([0-9.]+)/i);
    if (match) browserVersion = match[1];
  }

  let deviceModel = "unknown";
  if (/Android/i.test(ua)) {
    const match =
      ua.match(/Android [^;]+; ([^;]+)\sBuild/i) ||
      ua.match(/Android [^;]+; ([^;)]+)[);]/i);
    if (match) deviceModel = match[1].trim();
  } else if (/iPhone/i.test(ua)) {
    deviceModel = "iPhone";
  } else if (/iPad/i.test(ua)) {
    deviceModel = "iPad";
  }

  let deviceType = "unknown";
  if (osName === "Android") deviceType = "android";
  else if (osName === "iOS") deviceType = "ios";
  else if (/Windows|macOS|Linux/.test(osName)) deviceType = "desktop";

  return {
    osName,
    osVersion,
    browserName,
    browserVersion,
    deviceModel,
    deviceType,
  };
};

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
  const userAgent = req.get("user-agent") || "unknown";
  const appVersion =
    req.get("x-app-version") || req.get("x-client-version") || "unknown";
  const parsedAgent = parseUserAgent(userAgent);
  const forwardedFor = req.get("x-forwarded-for");
  const clientIp =
    (forwardedFor ? forwardedFor.split(",")[0] : req.ip) || "unknown";
  res.on("finish", () => {
    void (async () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const ipDetails = await fetchIpDetails(clientIp);
      const logPayload = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Number(durationMs.toFixed(1)),
        ip: clientIp,
        country: ipDetails.country,
        region: ipDetails.region,
        isp: ipDetails.isp,
        deviceType: parsedAgent.deviceType,
        deviceModel: parsedAgent.deviceModel,
        os: `${parsedAgent.osName} ${parsedAgent.osVersion}`.trim(),
        browser: `${parsedAgent.browserName} ${parsedAgent.browserVersion}`.trim(),
        appVersion,
        userAgent,
      };
      console.log(JSON.stringify(logPayload));
    })();
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

import crypto from "crypto";

const safeString = (value) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

export const hashEmail = (email) => {
  const normalized = safeString(email)?.toLowerCase();
  if (!normalized || !normalized.includes("@")) return undefined;
  return crypto.createHash("sha256").update(normalized).digest("hex");
};

export const maskEmail = (email) => {
  const normalized = safeString(email)?.toLowerCase();
  if (!normalized || !normalized.includes("@")) return undefined;
  const [local, domain] = normalized.split("@");
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}***@${domain}`;
};

export const getClientIp = (req) => {
  const forwardedFor = req.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : req.ip;
  return ip || "unknown";
};

const parseUserAgent = (userAgent) => {
  const ua = userAgent || "";

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
    deviceType,
    deviceModel,
    os: `${osName} ${osVersion}`.trim(),
    browser: `${browserName} ${browserVersion}`.trim(),
  };
};

export const getDeviceInfo = (req) => {
  const headerDeviceType = safeString(req.get("x-device-type"));
  const headerDeviceModel = safeString(req.get("x-device-model"));
  const headerOs = safeString(req.get("x-os"));
  const headerBrowser = safeString(req.get("x-browser"));
  const headerAppVersion =
    safeString(req.get("x-app-version")) || safeString(req.get("x-client-version"));

  const parsed = parseUserAgent(req.get("user-agent"));

  return {
    deviceType: headerDeviceType || parsed.deviceType,
    deviceModel: headerDeviceModel || parsed.deviceModel,
    os: headerOs || parsed.os,
    browser: headerBrowser || parsed.browser,
    appVersion: headerAppVersion,
  };
};

const writeLog = (level, payload) => {
  const entry = {
    timestamp: new Date().toISOString(),
    logLevel: level,
    ...payload,
  };
  setImmediate(() => {
    console.log(JSON.stringify(entry));
  });
};

export const logger = {
  info: (payload) => writeLog("info", payload),
  warn: (payload) => writeLog("warn", payload),
  error: (payload) => writeLog("error", payload),
};

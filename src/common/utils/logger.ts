import crypto from 'node:crypto';
import type { Request } from 'express';

const LOG_LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

const configuredLogLevel = (): LogLevel => {
  const raw = process.env.LOG_LEVEL?.toLowerCase();
  return raw && raw in LOG_LEVELS ? (raw as LogLevel) : 'info';
};

const shouldLog = (level: LogLevel): boolean =>
  LOG_LEVELS[level] >= LOG_LEVELS[configuredLogLevel()];

const safeString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

export const hashEmail = (email: unknown): string | undefined => {
  const normalized = safeString(email)?.toLowerCase();
  if (!normalized || !normalized.includes('@')) return undefined;
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

export const maskEmail = (email: unknown): string | undefined => {
  const normalized = safeString(email)?.toLowerCase();
  if (!normalized || !normalized.includes('@')) return undefined;
  const [local = '', domain = 'unknown'] = normalized.split('@');
  const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return `${visible}***@${domain}`;
};

export const getClientIp = (req: Request): string => {
  const forwardedFor = req.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0]?.trim() : req.ip;
  return ip || 'unknown';
};

const parseUserAgent = (userAgent?: string) => {
  const ua = userAgent ?? '';
  let osName = 'unknown';
  let osVersion = 'unknown';

  if (/android/i.test(ua)) {
    osName = 'Android';
    osVersion = ua.match(/Android\s([0-9.]+)/i)?.[1] ?? osVersion;
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    osName = 'iOS';
    osVersion = ua.match(/OS\s([0-9_]+)/i)?.[1]?.replace(/_/g, '.') ?? osVersion;
  } else if (/Windows NT/i.test(ua)) {
    osName = 'Windows';
    osVersion = ua.match(/Windows NT\s([0-9.]+)/i)?.[1] ?? osVersion;
  } else if (/Mac OS X/i.test(ua)) {
    osName = 'macOS';
    osVersion = ua.match(/Mac OS X\s([0-9_]+)/i)?.[1]?.replace(/_/g, '.') ?? osVersion;
  } else if (/Linux/i.test(ua)) {
    osName = 'Linux';
  }

  let browserName = 'unknown';
  let browserVersion = 'unknown';
  const browserChecks: Array<[RegExp, string]> = [
    [/Edg\/([0-9.]+)/i, 'Edge'],
    [/OPR\/([0-9.]+)/i, 'Opera'],
    [/Chrome\/([0-9.]+)/i, 'Chrome'],
    [/Firefox\/([0-9.]+)/i, 'Firefox'],
    [/Version\/([0-9.]+).*Safari\//i, 'Safari'],
  ];
  for (const [regex, name] of browserChecks) {
    const match = ua.match(regex);
    if (match?.[1]) {
      browserName = name;
      browserVersion = match[1];
      break;
    }
  }

  let deviceModel = 'unknown';
  if (/Android/i.test(ua)) {
    deviceModel =
      ua.match(/Android [^;]+; ([^;]+)\sBuild/i)?.[1]?.trim() ??
      ua.match(/Android [^;]+; ([^;)]+)[);]/i)?.[1]?.trim() ??
      deviceModel;
  } else if (/iPhone/i.test(ua)) deviceModel = 'iPhone';
  else if (/iPad/i.test(ua)) deviceModel = 'iPad';

  let deviceType = 'unknown';
  if (osName === 'Android') deviceType = 'android';
  else if (osName === 'iOS') deviceType = 'ios';
  else if (/Windows|macOS|Linux/.test(osName)) deviceType = 'desktop';

  return {
    deviceType,
    deviceModel,
    os: `${osName} ${osVersion}`.trim(),
    browser: `${browserName} ${browserVersion}`.trim(),
  };
};

export const getDeviceInfo = (req: Request) => {
  const parsed = parseUserAgent(req.get('user-agent'));
  return {
    deviceType: req.get('x-device-type')?.trim() || parsed.deviceType,
    deviceModel: req.get('x-device-model')?.trim() || parsed.deviceModel,
    os: req.get('x-os')?.trim() || parsed.os,
    browser: req.get('x-browser')?.trim() || parsed.browser,
    appVersion: req.get('x-app-version')?.trim() || req.get('x-client-version')?.trim(),
  };
};

const SENSITIVE_KEYS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'otp',
]);

export const redactSensitive = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
      key,
      SENSITIVE_KEYS.has(key) ? '[REDACTED]' : redactSensitive(nestedValue),
    ]),
  );
};

const writeLog = (level: LogLevel, payload: unknown): void => {
  if (!shouldLog(level)) return;

  const entry = {
    timestamp: new Date().toISOString(),
    logLevel: level,
    ...(typeof payload === 'object' && payload !== null ? payload : { message: String(payload) }),
  };
  setImmediate(() => console.log(JSON.stringify(entry)));
};

export const logger = {
  debug: (payload: unknown) => writeLog('debug', payload),
  info: (payload: unknown) => writeLog('info', payload),
  warn: (payload: unknown) => writeLog('warn', payload),
  error: (payload: unknown) => writeLog('error', payload),
};

import type { NextFunction, Request, Response } from 'express';

const DANGEROUS_MONGO_KEY = /(^\$|\.)/;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const sanitizeMongoValue = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMongoValue(item)) as T;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (DANGEROUS_MONGO_KEY.test(key)) {
      continue;
    }

    sanitized[key] = sanitizeMongoValue(nestedValue);
  }

  return sanitized as T;
};

const replaceRequestProperty = <K extends keyof Request>(
  request: Request,
  key: K,
  value: Request[K],
): void => {
  Object.defineProperty(request, key, {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
};

export const noSqlSanitizationMiddleware = (
  request: Request,
  _response: Response,
  next: NextFunction,
): void => {
  try {
    if (request.body && typeof request.body === 'object') {
      request.body = sanitizeMongoValue(request.body);
    }

    if (request.params && typeof request.params === 'object') {
      replaceRequestProperty(request, 'params', sanitizeMongoValue(request.params));
    }

    if (request.query && typeof request.query === 'object') {
      // Express 5 exposes req.query as a getter-only property. Do not use
      // express-mongo-sanitize as a middleware here because it tries to assign
      // back to req.query and throws: "Cannot set property query ... getter".
      replaceRequestProperty(request, 'query', sanitizeMongoValue(request.query));
    }

    next();
  } catch (error) {
    next(error);
  }
};

export { sanitizeMongoValue };

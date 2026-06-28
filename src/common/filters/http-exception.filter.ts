import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ERROR_CODES, HTTP_STATUS, type ErrorCode } from '../constants/error-codes';
import { adminError, apiError } from '../utils/response';
import { isAdminRoute, isV11Route } from '../utils/request-meta';

interface NormalizedException {
  statusCode: number;
  code: ErrorCode | string;
  message: string | string[];
  details?: unknown;
  stack?: string;
  errors?: Record<string, unknown>;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    if (response.headersSent) return;

    const normalized = this.normalizeException(exception);
    response.locals.errorMessage = normalized.message;

    const path = request.originalUrl || request.url || '';

    if (isAdminRoute(path)) {
      const errors = this.detailsToErrorMap(normalized.details ?? normalized.errors);
      response.status(normalized.statusCode).json(adminError(request, normalized.message, errors));
      return;
    }

    if (isV11Route(path)) {
      response
        .status(normalized.statusCode)
        .json(apiError(normalized.code, normalized.message, normalized.details));
      return;
    }

    const legacyBody: Record<string, unknown> = {
      message: normalized.message,
    };

    if (normalized.errors) {
      legacyBody.errors = normalized.errors;
    }

    if (process.env.NODE_ENV !== 'production' && normalized.stack) {
      legacyBody.stack = normalized.stack;
    }

    response.status(normalized.statusCode).json(legacyBody);
  }

  private normalizeException(exception: unknown): NormalizedException {
    let statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    let code: ErrorCode | string = ERROR_CODES.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Something went wrong';
    let details: unknown;
    let errors: Record<string, unknown> | undefined;
    let stack: string | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (exceptionResponse && typeof exceptionResponse === 'object') {
        const payload = exceptionResponse as {
          message?: string | string[];
          error?: string;
          code?: string;
          details?: unknown;
          errors?: Record<string, unknown>;
        };
        message = payload.message ?? payload.error ?? exception.message;
        code = payload.code ?? this.codeForStatus(statusCode);
        details = payload.details;
        errors = payload.errors;
      } else {
        message = exception.message;
      }
    } else if (exception && typeof exception === 'object') {
      const err = exception as {
        name?: string;
        status?: number;
        statusCode?: number;
        code?: string | number;
        message?: string;
        details?: unknown;
        errors?: Record<string, { path?: string; message?: string }>;
        keyPattern?: Record<string, unknown>;
        value?: unknown;
        stack?: string;
      };

      statusCode = err.status ?? err.statusCode ?? statusCode;
      code = typeof err.code === 'string' ? err.code : this.codeForStatus(statusCode);
      message = err.message ?? message;
      details = err.details;
      stack = err.stack;

      if (err.name === 'ValidationError' && err.errors) {
        statusCode = HTTP_STATUS.BAD_REQUEST;
        code = ERROR_CODES.VALIDATION_ERROR;
        message = 'Validation Error';
        details = Object.fromEntries(
          Object.values(err.errors).map((val) => [
            val.path ?? 'field',
            val.message ?? 'Invalid value',
          ]),
        );
      }

      if (err.code === 11000) {
        statusCode = HTTP_STATUS.BAD_REQUEST;
        code = ERROR_CODES.RESOURCE_ALREADY_EXISTS;
        message = 'Duplicate field value entered';
        if (err.keyPattern?.email) {
          code = ERROR_CODES.USER_ALREADY_EXISTS;
          message = 'User with this email already exists';
        }
      }

      if (err.name === 'CastError') {
        statusCode = HTTP_STATUS.NOT_FOUND;
        code = ERROR_CODES.RESOURCE_NOT_FOUND;
        message = `Resource not found with id of ${String(err.value)}`;
      }

      if (err.name === 'JsonWebTokenError') {
        statusCode = HTTP_STATUS.UNAUTHORIZED;
        code = ERROR_CODES.AUTH_INVALID_CREDENTIALS;
        message = 'Invalid token';
      }

      if (err.name === 'TokenExpiredError') {
        statusCode = HTTP_STATUS.UNAUTHORIZED;
        code = ERROR_CODES.AUTH_TOKEN_EXPIRED;
        message = 'Token expired';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      stack = exception.stack;
    }

    if (!Number.isFinite(statusCode) || statusCode < 100) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    if (!code || code === this.codeForStatus(0)) {
      code = this.codeForStatus(statusCode);
    }

    return { statusCode, code, message, details, errors, stack };
  }

  private codeForStatus(status: number): ErrorCode | string {
    if (status === HTTP_STATUS.BAD_REQUEST) return ERROR_CODES.VALIDATION_ERROR;
    if (status === HTTP_STATUS.UNAUTHORIZED) return ERROR_CODES.AUTH_UNAUTHORIZED;
    if (status === HTTP_STATUS.FORBIDDEN) return ERROR_CODES.AUTH_FORBIDDEN;
    if (status === HTTP_STATUS.NOT_FOUND) return ERROR_CODES.RESOURCE_NOT_FOUND;
    if (status === HTTP_STATUS.UNPROCESSABLE_ENTITY) return ERROR_CODES.UNPROCESSABLE_ENTITY;
    if (status === HTTP_STATUS.TOO_MANY_REQUESTS) return ERROR_CODES.RATE_LIMIT_EXCEEDED;
    return ERROR_CODES.INTERNAL_SERVER_ERROR;
  }

  private detailsToErrorMap(details: unknown): Record<string, unknown> | undefined {
    if (!details || typeof details !== 'object') return undefined;
    const entries = Object.entries(details as Record<string, unknown>).filter(
      ([, value]) => value !== undefined,
    );
    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }
}

import type { Request } from 'express';
import { getAdminRequestMeta } from './request-meta';
import { ERROR_CODES, type ErrorCode } from '../constants/error-codes';

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode | string;
    message: string | string[];
    details?: unknown;
  };
}

export interface AdminSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
  };
}

export interface AdminErrorResponse {
  success: false;
  message: string | string[];
  meta: {
    requestId: string;
    timestamp: string;
  };
  errors?: Record<string, unknown>;
}

export const apiSuccess = <T>(
  data: T,
  message = 'Operation successful',
): ApiSuccessResponse<T> => ({
  success: true,
  message,
  data,
});

export const apiError = (
  code: ErrorCode | string = ERROR_CODES.INTERNAL_SERVER_ERROR,
  message: string | string[] = 'An unexpected error occurred',
  details?: unknown,
): ApiErrorResponse => ({
  success: false,
  error: {
    code,
    message,
    details,
  },
});

export const adminSuccess = <T>(
  request: Request,
  data: T,
  message = 'Operation successful.',
): AdminSuccessResponse<T> => ({
  success: true,
  message,
  data,
  meta: getAdminRequestMeta(request),
});

export const adminError = (
  request: Request,
  message: string | string[] = 'Internal server error.',
  errors?: Record<string, unknown>,
): AdminErrorResponse => {
  const body: AdminErrorResponse = {
    success: false,
    message,
    meta: getAdminRequestMeta(request),
  };

  if (errors && Object.keys(errors).length > 0) {
    body.errors = errors;
  }

  return body;
};

export const isAlreadyFormattedResponse = (value: unknown): boolean =>
  Boolean(value && typeof value === 'object' && ('success' in value || 'error' in value));

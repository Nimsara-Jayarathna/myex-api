import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import mongoose from 'mongoose';
import type { Request, Response } from 'express';
import { ERROR_CODES } from '../constants/error-codes';
import { adminError, apiError } from '../utils/response';
import { isAdminRoute, isV11Route } from '../utils/request-meta';

@Catch(mongoose.mongo.MongoServerError)
export class MongooseExceptionFilter implements ExceptionFilter {
  catch(exception: mongoose.mongo.MongoServerError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    if (response.headersSent) return;

    const path = request.originalUrl || request.url || '';
    const keyPattern = (exception as mongoose.mongo.MongoServerError & { keyPattern?: Record<string, unknown> }).keyPattern ?? {};
    const duplicateEmail = exception.code === 11000 && 'email' in keyPattern;
    const statusCode = exception.code === 11000 ? 400 : 500;
    const code = duplicateEmail
      ? ERROR_CODES.USER_ALREADY_EXISTS
      : exception.code === 11000
        ? ERROR_CODES.RESOURCE_ALREADY_EXISTS
        : ERROR_CODES.INTERNAL_SERVER_ERROR;
    const message = duplicateEmail
      ? 'User with this email already exists'
      : exception.code === 11000
        ? 'Duplicate field value entered'
        : 'Database operation failed';

    if (isAdminRoute(path)) {
      response.status(statusCode).json(adminError(request, message));
      return;
    }

    if (isV11Route(path)) {
      response.status(statusCode).json(apiError(code, message));
      return;
    }

    response.status(statusCode).json({ message });
  }
}

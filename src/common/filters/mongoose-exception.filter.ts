import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import mongoose from 'mongoose';
import type { Response } from 'express';

@Catch(mongoose.mongo.MongoServerError)
export class MongooseExceptionFilter implements ExceptionFilter {
  catch(exception: mongoose.mongo.MongoServerError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception.code === 11000) {
      response.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'Duplicate value already exists' },
      });
      return;
    }

    response.status(500).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Database operation failed' },
    });
  }
}

import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ERROR_CODES } from '../constants/error-codes';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : typeof exception === 'object' && exception !== null && 'status' in exception
          ? Number((exception as { status?: number }).status)
          : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    const message =
      typeof exceptionResponse === 'object' && exceptionResponse !== null && 'message' in exceptionResponse
        ? (exceptionResponse as { message?: string | string[] }).message
        : exception instanceof Error
          ? exception.message
          : 'An unexpected error occurred';

    response.status(Number.isFinite(status) ? status : HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: this.codeForStatus(status),
        message,
      },
    });
  }

  private codeForStatus(status: number): string {
    if (status === 400) return ERROR_CODES.BAD_REQUEST;
    if (status === 401) return ERROR_CODES.UNAUTHORIZED;
    if (status === 403) return ERROR_CODES.FORBIDDEN;
    if (status === 404) return ERROR_CODES.NOT_FOUND;
    if (status === 409) return ERROR_CODES.CONFLICT;
    return ERROR_CODES.INTERNAL_SERVER_ERROR;
  }
}

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { tap, type Observable } from 'rxjs';
import { getClientIp, getDeviceInfo, hashEmail, logger, redactSensitive } from '../utils/logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: { email?: string } }>();
    const response = context.switchToHttp().getResponse<Response>();
    const start = process.hrtime.bigint();

    this.logRequestStart(request);

    return next.handle().pipe(
      tap({
        next: () => this.logRequestEnd(request, response, start),
        error: (error: Error) => this.logRequestEnd(request, response, start, error),
      }),
    );
  }

  private logRequestStart(req: Request & { user?: { email?: string } }): void {
    const shouldLogBody = process.env.DEBUG_LOG_BODY === 'true';

    logger.debug({
      event: 'request_started',
      method: req.method,
      path: req.path,
      query: redactSensitive(req.query),
      body: shouldLogBody ? redactSensitive(req.body) : undefined,
      clientIp: getClientIp(req),
      userAgent: req.get('user-agent'),
    });
  }

  private logRequestEnd(
    req: Request & { user?: { email?: string } },
    res: Response,
    start: bigint,
    error?: Error,
  ): void {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const device = getDeviceInfo(req);
    const status = res.statusCode || (error ? 500 : 200);
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    logger[level]({
      event: 'request_finished',
      method: req.method,
      path: req.path,
      status,
      durationMs: Number(durationMs.toFixed(1)),
      clientIp: getClientIp(req),
      userEmailHash: hashEmail(req.user?.email),
      ...device,
      userAgent: req.get('user-agent'),
      errorMessage: error?.message,
    });
  }
}

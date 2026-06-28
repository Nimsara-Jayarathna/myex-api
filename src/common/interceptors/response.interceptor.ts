import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { map, type Observable } from 'rxjs';
import {
  RESPONSE_MODE_METADATA,
  type ResponseMode as ResponseModeValue,
} from '../decorators/response-mode.decorator';
import { RESPONSE_MESSAGE_METADATA } from '../decorators/response-message.decorator';
import { adminSuccess, apiSuccess, isAlreadyFormattedResponse } from '../utils/response';
import { isAdminRoute, isV11Route } from '../utils/request-meta';

const isExpressResponseLike = (value: unknown): boolean =>
  Boolean(
    value &&
      typeof value === 'object' &&
      'statusCode' in value &&
      'setHeader' in value &&
      'end' in value,
  );

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const mode = this.resolveMode(context, request);
    const message = this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);

    return next.handle().pipe(
      map((data: unknown) => {
        if (response.headersSent || response.statusCode === 204 || mode === 'passthrough') {
          return data;
        }

        if (Buffer.isBuffer(data) || isExpressResponseLike(data) || isAlreadyFormattedResponse(data)) {
          return data;
        }

        if (mode === 'legacy') {
          return data;
        }

        if (mode === 'admin') {
          return adminSuccess(request, data ?? {}, message ?? 'Operation successful.');
        }

        return apiSuccess(data, message ?? 'Operation successful');
      }),
    );
  }

  private resolveMode(context: ExecutionContext, request: Request): ResponseModeValue {
    const explicitMode = this.reflector.getAllAndOverride<ResponseModeValue>(RESPONSE_MODE_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (explicitMode) return explicitMode;

    const path = request.originalUrl || request.url || '';
    if (isAdminRoute(path)) return 'admin';
    if (isV11Route(path)) return 'standard';
    return 'legacy';
  }
}

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { tap, type Observable } from 'rxjs';
import { AdminAuditService } from '../../modules/admin/audit/admin-audit.service';

@Injectable()
export class AdminAuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AdminAuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { admin?: { email?: string } }>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          void this.auditService.record({
            adminEmail: request.admin?.email ?? null,
            method: request.method,
            path: request.path,
            status: 'success',
            durationMs: Date.now() - start,
          });
        },
        error: (error: Error) => {
          void this.auditService.record({
            adminEmail: request.admin?.email ?? null,
            method: request.method,
            path: request.path,
            status: 'failed',
            durationMs: Date.now() - start,
            errorMessage: error.message,
          });
        },
      }),
    );
  }
}

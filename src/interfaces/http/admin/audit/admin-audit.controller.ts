import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ResponseMode } from '../../../../common/decorators/response-mode.decorator';
import { ResponseMessage } from '../../../../common/decorators/response-message.decorator';
import { AdminJwtGuard } from '../../../../common/guards/admin-jwt.guard';
import { AdminRoleGuard } from '../../../../common/guards/admin-role.guard';
import { AdminPermissionGuard } from '../../../../common/guards/admin-permission.guard';
import { AdminIpAllowlistGuard } from '../../../../common/guards/admin-ip-allowlist.guard';
import { AdminRateLimiter } from '../../../../common/guards/admin-rate-limiter.guard';
import { AdminAuditLogInterceptor } from '../../../../common/interceptors/admin-audit-log.interceptor';
import { AdminAuditService } from '../../../../modules/admin/audit/admin-audit.service';

@ResponseMode('admin')
@Controller('internal/admin/audit')
@UseGuards(AdminIpAllowlistGuard, AdminRateLimiter, AdminJwtGuard, AdminRoleGuard, AdminPermissionGuard)
@UseInterceptors(AdminAuditLogInterceptor)
export class InternalAdminAuditController {
  constructor(private readonly auditService: AdminAuditService) {}

  @Get()
  @ResponseMessage('Audit logs loaded.')
  list(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.auditService.list(Number(page ?? 1), Number(pageSize ?? 20));
  }
}

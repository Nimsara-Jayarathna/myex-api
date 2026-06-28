import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../common/guards/admin-jwt.guard';
import { AdminRoleGuard } from '../../../../common/guards/admin-role.guard';
import { AdminPermissionGuard } from '../../../../common/guards/admin-permission.guard';
import { AdminIpAllowlistGuard } from '../../../../common/guards/admin-ip-allowlist.guard';
import { AdminRateLimiter } from '../../../../common/guards/admin-rate-limiter.guard';
import { AdminAuditService } from '../../../../modules/admin/audit/admin-audit.service';

@Controller('internal/admin/audit')
@UseGuards(AdminIpAllowlistGuard, AdminRateLimiter, AdminJwtGuard, AdminRoleGuard, AdminPermissionGuard)
export class InternalAdminAuditController {
  constructor(private readonly auditService: AdminAuditService) {}

  @Get()
  list(@Query('page') page?: number, @Query('pageSize') pageSize?: number) {
    return this.auditService.list(Number(page ?? 1), Number(pageSize ?? 20));
  }
}

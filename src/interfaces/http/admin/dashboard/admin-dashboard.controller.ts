import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../common/guards/admin-jwt.guard';
import { AdminRoleGuard } from '../../../../common/guards/admin-role.guard';
import { AdminPermissionGuard } from '../../../../common/guards/admin-permission.guard';
import { AdminIpAllowlistGuard } from '../../../../common/guards/admin-ip-allowlist.guard';
import { AdminRateLimiter } from '../../../../common/guards/admin-rate-limiter.guard';
import { AdminAuditLogInterceptor } from '../../../../common/interceptors/admin-audit-log.interceptor';
import { AdminDashboardService } from '../../../../modules/admin/dashboard/admin-dashboard.service';

@Controller('internal/admin/dashboard')
@UseGuards(AdminIpAllowlistGuard, AdminRateLimiter, AdminJwtGuard, AdminRoleGuard, AdminPermissionGuard)
@UseInterceptors(AdminAuditLogInterceptor)
export class InternalAdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get()
  dashboard() {
    return this.dashboardService.getDashboard();
  }
}

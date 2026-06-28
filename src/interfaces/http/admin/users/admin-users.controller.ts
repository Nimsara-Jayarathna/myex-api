import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../common/guards/admin-jwt.guard';
import { AdminRoleGuard } from '../../../../common/guards/admin-role.guard';
import { AdminPermissionGuard } from '../../../../common/guards/admin-permission.guard';
import { AdminIpAllowlistGuard } from '../../../../common/guards/admin-ip-allowlist.guard';
import { AdminRateLimiter } from '../../../../common/guards/admin-rate-limiter.guard';
import { AdminAuditLogInterceptor } from '../../../../common/interceptors/admin-audit-log.interceptor';
import { AdminUsersService } from '../../../../modules/admin/users/admin-users.service';
import { AdminUserFilterDto } from '../../../../modules/admin/users/dto/admin-user-filter.dto';
import { UpdateUserStatusDto } from '../../../../modules/admin/users/dto/update-user-status.dto';

@Controller('internal/admin/users')
@UseGuards(AdminIpAllowlistGuard, AdminRateLimiter, AdminJwtGuard, AdminRoleGuard, AdminPermissionGuard)
@UseInterceptors(AdminAuditLogInterceptor)
export class InternalAdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  users(@Query() query: AdminUserFilterDto) {
    return this.adminUsersService.listUsers(query);
  }

  @Get(':id')
  userById(@Param('id') id: string) {
    return this.adminUsersService.getUserById(id);
  }

  @Patch(':id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.adminUsersService.updateUserById(id, dto);
  }

  @Post(':id/reset-password')
  resetUserPassword(@Param('id') id: string) {
    return this.adminUsersService.resetUserPassword(id);
  }

  @Post(':id/force-logout')
  forceLogoutUser(@Param('id') id: string) {
    return this.adminUsersService.forceLogoutUser(id);
  }

  @Get(':id/activity')
  userActivity(@Param('id') id: string) {
    return this.adminUsersService.getUserActivity(id);
  }
}

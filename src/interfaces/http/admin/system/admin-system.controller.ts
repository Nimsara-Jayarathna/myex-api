import { Body, Controller, Get, Param, Post, Query, Res, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Response } from 'express';
import { AdminJwtGuard } from '../../../../common/guards/admin-jwt.guard';
import { AdminRoleGuard } from '../../../../common/guards/admin-role.guard';
import { AdminPermissionGuard } from '../../../../common/guards/admin-permission.guard';
import { AdminIpAllowlistGuard } from '../../../../common/guards/admin-ip-allowlist.guard';
import { AdminRateLimiter } from '../../../../common/guards/admin-rate-limiter.guard';
import { AdminAuditLogInterceptor } from '../../../../common/interceptors/admin-audit-log.interceptor';
import { CurrentAdmin } from '../../../../common/decorators/current-admin.decorator';
import type { AdminUserDocument } from '../../../../modules/admin/auth/schemas/admin-user.schema';
import { AdminSystemService } from '../../../../modules/admin/system/admin-system.service';
import { CreateDeleteRequestDto, DecideDeleteRequestDto, RunBackupDto } from '../../../../modules/admin/system/dto/admin-system.dto';

@Controller('internal/admin/system')
@UseGuards(AdminIpAllowlistGuard, AdminRateLimiter, AdminJwtGuard, AdminRoleGuard, AdminPermissionGuard)
@UseInterceptors(AdminAuditLogInterceptor)
export class InternalAdminSystemController {
  constructor(private readonly adminSystemService: AdminSystemService) {}

  @Get()
  snapshot() {
    return this.adminSystemService.getSystemSnapshot();
  }

  @Get('provider-usage')
  providerUsage(@Query('date') date?: string) {
    return this.adminSystemService.getProviderUsageHistory({ date });
  }

  @Post('backup/run')
  runBackup(@Body() dto: RunBackupDto, @CurrentAdmin() admin: AdminUserDocument) {
    return this.adminSystemService.startBackup(admin.email, { simulateFailure: dto.simulateFailure });
  }

  @Get('backup/:id')
  backupById(@Param('id') id: string) {
    return this.adminSystemService.getBackupById(id);
  }

  @Get('backup/:id/download')
  async downloadBackup(@Param('id') id: string, @Res() res: Response) {
    const file = await this.adminSystemService.getBackupDownloadFile(id);
    return res.download(file.path, file.fileName);
  }

  @Post('backup/:id/cancel')
  cancelBackup(@Param('id') id: string) {
    return this.adminSystemService.cancelBackup(id);
  }

  @Get('delete-requests')
  deleteRequests(@Query() query: { status?: string; page?: number; pageSize?: number }) {
    return this.adminSystemService.listDeleteRequests(query);
  }

  @Post('delete-requests')
  createDeleteRequest(@Body() dto: CreateDeleteRequestDto) {
    return this.adminSystemService.createDeleteRequest(dto);
  }

  @Post('delete-requests/:id/decision')
  decideDeleteRequest(@Param('id') id: string, @Body() dto: DecideDeleteRequestDto, @CurrentAdmin() admin: AdminUserDocument) {
    return this.adminSystemService.decideDeleteRequest(id, dto, admin.email);
  }
}

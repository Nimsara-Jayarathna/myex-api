import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../common/guards/admin-jwt.guard';
import { AdminRoleGuard } from '../../../../common/guards/admin-role.guard';
import { AdminPermissionGuard } from '../../../../common/guards/admin-permission.guard';
import { AdminIpAllowlistGuard } from '../../../../common/guards/admin-ip-allowlist.guard';
import { AdminRateLimiter } from '../../../../common/guards/admin-rate-limiter.guard';
import { AdminAuditLogInterceptor } from '../../../../common/interceptors/admin-audit-log.interceptor';
import { CurrentAdmin } from '../../../../common/decorators/current-admin.decorator';
import type { AdminUserDocument } from '../../../../modules/admin/auth/schemas/admin-user.schema';
import { AdminCategoriesService } from '../../../../modules/admin/categories/admin-categories.service';
import { AdminCategoryDto, UpdateAdminCategoryDto, UpdateCategorySettingsDto } from '../../../../modules/admin/categories/dto/admin-category.dto';

@Controller('internal/admin/categories')
@UseGuards(AdminIpAllowlistGuard, AdminRateLimiter, AdminJwtGuard, AdminRoleGuard, AdminPermissionGuard)
@UseInterceptors(AdminAuditLogInterceptor)
export class InternalAdminCategoriesController {
  constructor(private readonly adminCategoriesService: AdminCategoriesService) {}

  @Get()
  categories(@Query() query: { type?: 'income' | 'expense'; isActive?: boolean }) {
    return this.adminCategoriesService.listCategories(query);
  }

  @Post()
  createCategory(@Body() dto: AdminCategoryDto, @CurrentAdmin() admin: AdminUserDocument) {
    return this.adminCategoriesService.createCategory(dto, admin.email);
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateCategorySettingsDto, @CurrentAdmin() admin: AdminUserDocument) {
    return this.adminCategoriesService.updateCategoryLimit(dto.defaultCategoryLimit, admin.email);
  }

  @Patch(':id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateAdminCategoryDto, @CurrentAdmin() admin: AdminUserDocument) {
    return this.adminCategoriesService.updateCategory(id, dto, admin.email);
  }

  @Post(':id/set-default')
  setDefault(@Param('id') id: string, @CurrentAdmin() admin: AdminUserDocument) {
    return this.adminCategoriesService.setDefaultCategory(id, admin.email);
  }

  @Delete(':id')
  deleteCategory(@Param('id') id: string) {
    return this.adminCategoriesService.deleteCategory(id);
  }
}

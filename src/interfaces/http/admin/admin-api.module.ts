import { Module } from '@nestjs/common';
import { AdminModule } from '../../../modules/admin/admin.module';
import { AdminAuthModule } from '../../../modules/admin/auth/admin-auth.module';
import { AdminDashboardModule } from '../../../modules/admin/dashboard/admin-dashboard.module';
import { AdminUsersModule } from '../../../modules/admin/users/admin-users.module';
import { AdminCurrenciesModule } from '../../../modules/admin/currencies/admin-currencies.module';
import { AdminCategoriesModule } from '../../../modules/admin/categories/admin-categories.module';
import { AdminSystemModule } from '../../../modules/admin/system/admin-system.module';
import { AdminAuditModule } from '../../../modules/admin/audit/admin-audit.module';
import { InternalAdminAuthController } from './auth/admin-auth.controller';
import { InternalAdminDashboardController } from './dashboard/admin-dashboard.controller';
import { InternalAdminUsersController } from './users/admin-users.controller';
import { InternalAdminCurrenciesController } from './currencies/admin-currencies.controller';
import { InternalAdminCategoriesController } from './categories/admin-categories.controller';
import { InternalAdminSystemController } from './system/admin-system.controller';
import { InternalAdminAuditController } from './audit/admin-audit.controller';
import { AdminIpAllowlistGuard } from '../../../common/guards/admin-ip-allowlist.guard';
import { AdminRateLimiter } from '../../../common/guards/admin-rate-limiter.guard';
import { AdminJwtGuard } from '../../../common/guards/admin-jwt.guard';
import { AdminRoleGuard } from '../../../common/guards/admin-role.guard';
import { AdminPermissionGuard } from '../../../common/guards/admin-permission.guard';
import { AdminAuditLogInterceptor } from '../../../common/interceptors/admin-audit-log.interceptor';

@Module({
  imports: [
    AdminModule,
    AdminAuthModule,
    AdminDashboardModule,
    AdminUsersModule,
    AdminCurrenciesModule,
    AdminCategoriesModule,
    AdminSystemModule,
    AdminAuditModule,
  ],
  controllers: [
    InternalAdminAuthController,
    InternalAdminDashboardController,
    InternalAdminUsersController,
    InternalAdminCurrenciesController,
    InternalAdminCategoriesController,
    InternalAdminSystemController,
    InternalAdminAuditController,
  ],
  providers: [
    AdminIpAllowlistGuard,
    AdminRateLimiter,
    AdminJwtGuard,
    AdminRoleGuard,
    AdminPermissionGuard,
    AdminAuditLogInterceptor,
  ],
})
export class AdminApiModule {}

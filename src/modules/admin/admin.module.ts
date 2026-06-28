import { Module } from '@nestjs/common';
import { AdminAuthModule } from './auth/admin-auth.module';
import { AdminUsersModule } from './users/admin-users.module';
import { AdminCategoriesModule } from './categories/admin-categories.module';
import { AdminCurrenciesModule } from './currencies/admin-currencies.module';
import { AdminDashboardModule } from './dashboard/admin-dashboard.module';
import { AdminSystemModule } from './system/admin-system.module';
import { AdminAuditModule } from './audit/admin-audit.module';

@Module({
  imports: [
    AdminAuthModule,
    AdminUsersModule,
    AdminCategoriesModule,
    AdminCurrenciesModule,
    AdminDashboardModule,
    AdminSystemModule,
    AdminAuditModule,
  ],
  exports: [
    AdminAuthModule,
    AdminUsersModule,
    AdminCategoriesModule,
    AdminCurrenciesModule,
    AdminDashboardModule,
    AdminSystemModule,
    AdminAuditModule,
  ],
})
export class AdminModule {}

import { Body, Controller, Get, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { AdminJwtGuard } from '../../../../common/guards/admin-jwt.guard';
import { AdminRoleGuard } from '../../../../common/guards/admin-role.guard';
import { AdminPermissionGuard } from '../../../../common/guards/admin-permission.guard';
import { AdminIpAllowlistGuard } from '../../../../common/guards/admin-ip-allowlist.guard';
import { AdminRateLimiter } from '../../../../common/guards/admin-rate-limiter.guard';
import { AdminAuditLogInterceptor } from '../../../../common/interceptors/admin-audit-log.interceptor';
import { AdminCurrenciesService } from '../../../../modules/admin/currencies/admin-currencies.service';
import { AdminCurrencyDto, UpdateAdminCurrencyDto } from '../../../../modules/admin/currencies/dto/admin-currency.dto';

@Controller('internal/admin/currencies')
@UseGuards(AdminIpAllowlistGuard, AdminRateLimiter, AdminJwtGuard, AdminRoleGuard, AdminPermissionGuard)
@UseInterceptors(AdminAuditLogInterceptor)
export class InternalAdminCurrenciesController {
  constructor(private readonly adminCurrenciesService: AdminCurrenciesService) {}

  @Get()
  currencies() {
    return this.adminCurrenciesService.listCurrencies();
  }

  @Get(':id')
  currencyById(@Param('id') id: string) {
    return this.adminCurrenciesService.getCurrencyById(id);
  }

  @Post()
  createCurrency(@Body() dto: AdminCurrencyDto) {
    return this.adminCurrenciesService.createCurrency(dto);
  }

  @Patch(':id')
  updateCurrency(@Param('id') id: string, @Body() dto: UpdateAdminCurrencyDto) {
    return this.adminCurrenciesService.updateCurrencyById(id, dto);
  }

  @Post(':id/set-default')
  setCurrencyDefault(@Param('id') id: string) {
    return this.adminCurrenciesService.setCurrencyDefault(id);
  }

  @Post(':id/toggle-status')
  toggleCurrencyStatus(@Param('id') id: string, @Body() body: { isActive?: boolean }) {
    return this.adminCurrenciesService.toggleCurrencyStatus(id, body.isActive);
  }
}

import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import type { UserDocument } from '../../../../../modules/users/schemas/user.schema';
import { CurrenciesService } from '../../../../../modules/currencies/currencies.service';
import { UpdateUserCurrencyDto } from '../../../../../modules/currencies/dto/update-user-currency.dto';

@Controller('api/v1.1')
@UseGuards(JwtAuthGuard)
export class CurrenciesV11Controller {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get('currencies')
  list() {
    return this.currenciesService.listCurrencies();
  }

  @Put('users/currency')
  updateUserCurrency(@CurrentUser() user: UserDocument, @Body() dto: UpdateUserCurrencyDto) {
    return this.currenciesService.updateUserCurrency(user, dto.currencyId);
  }
}

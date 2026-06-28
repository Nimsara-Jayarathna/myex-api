import { Body, Controller, Get, HttpCode, Put, UseGuards } from '@nestjs/common';
import { ResponseMode } from '../../../../../common/decorators/response-mode.decorator';
import { ResponseMessage } from '../../../../../common/decorators/response-message.decorator';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import type { UserDocument } from '../../../../../modules/users/schemas/user.schema';
import { CurrenciesService } from '../../../../../modules/currencies/currencies.service';
import { UpdateUserCurrencyDto } from '../../../../../modules/currencies/dto/update-user-currency.dto';

@ResponseMode('standard')
@Controller('api/v1.1')
@UseGuards(JwtAuthGuard)
export class CurrenciesV11Controller {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get('currencies')
  @ResponseMessage('Currencies retrieved successfully')
  list() {
    return this.currenciesService.listCurrencies();
  }

  @Put('users/currency')
  @HttpCode(200)
  @ResponseMessage('Currency updated successfully')
  async updateUserCurrency(@CurrentUser() user: UserDocument, @Body() dto: UpdateUserCurrencyDto) {
    const result = await this.currenciesService.updateUserCurrency(user, dto.currencyId);
    return { currency: result.currency };
  }
}

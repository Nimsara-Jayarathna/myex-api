import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { CurrenciesRepository } from './currencies.repository';
import type { UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class CurrenciesService {
  constructor(
    private readonly currenciesRepository: CurrenciesRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  buildCurrencyResponse(currency: { [key: string]: any }) {
    return {
      id: currency._id,
      name: currency.name,
      code: currency.code,
      symbol: currency.symbol,
      isActive: currency.isActive,
      isDefault: currency.isDefault,
    };
  }

  async listCurrencies() {
    const currencies = await this.currenciesRepository.find({ isActive: true });
    return { currencies: currencies.map((currency) => this.buildCurrencyResponse(currency)) };
  }

  async updateUserCurrency(user: UserDocument, currencyId: string) {
    const currency = await this.currenciesRepository.findById(currencyId);
    if (!currency || !currency.isActive) throw new NotFoundException('Currency not found');
    const updated = await this.usersRepository.updateById(String(user._id), { currency: currency._id });
    return {
      user: updated,
      currency: this.buildCurrencyResponse(currency),
    };
  }
}

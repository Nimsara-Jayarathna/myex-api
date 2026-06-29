import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { CurrencyDocument } from '../../currencies/schemas/currency.schema';
import { CurrenciesRepository } from '../../currencies/currencies.repository';
import type { AdminCurrencyDto, UpdateAdminCurrencyDto } from './dto/admin-currency.dto';

@Injectable()
export class AdminCurrenciesService {
  constructor(private readonly currenciesRepository: CurrenciesRepository) {}

  async listCurrencies() {
    const currencies = await this.currenciesRepository.find({});
    const mappedCurrencies = currencies.map((currency) => this.toAdminCurrency(currency));
    return { currencies: mappedCurrencies, total: mappedCurrencies.length };
  }

  async getCurrencyById(id: string) {
    const currency = await this.currenciesRepository.findById(id);
    if (!currency) throw new NotFoundException('Currency not found');
    return this.toAdminCurrency(currency);
  }

  async createCurrency(dto: AdminCurrencyDto) {
    if (dto.isDefault) await this.currenciesRepository.updateMany({}, { isDefault: false });
    const currency = await this.currenciesRepository.create({
      ...dto,
      code: dto.code.toUpperCase().trim(),
    });
    return this.toAdminCurrency(currency);
  }

  async updateCurrencyById(id: string, dto: UpdateAdminCurrencyDto) {
    const currency = await this.currenciesRepository.findById(id);
    if (!currency) throw new NotFoundException('Currency not found');
    if (currency.isDefault && dto.isActive === false) {
      throw new BadRequestException('Default currency cannot be disabled');
    }
    if (dto.isDefault) await this.currenciesRepository.updateMany({}, { isDefault: false });
    Object.assign(currency, { ...dto, code: dto.code?.toUpperCase().trim() ?? currency.code });
    await currency.save();
    return this.toAdminCurrency(currency);
  }

  async setCurrencyDefault(id: string) {
    const currency = await this.currenciesRepository.findById(id);
    if (!currency) throw new NotFoundException('Currency not found');
    await this.currenciesRepository.updateMany({}, { isDefault: false });
    currency.isDefault = true;
    currency.isActive = true;
    await currency.save();
    return this.toAdminCurrency(currency);
  }

  async toggleCurrencyStatus(id: string, isActive?: boolean) {
    const currency = await this.currenciesRepository.findById(id);
    if (!currency) throw new NotFoundException('Currency not found');
    const nextIsActive = typeof isActive === 'boolean' ? isActive : !currency.isActive;
    if (currency.isDefault && !nextIsActive) {
      throw new BadRequestException('Default currency cannot be disabled');
    }
    currency.isActive = nextIsActive;
    await currency.save();
    return this.toAdminCurrency(currency);
  }

  private toAdminCurrency(currency: CurrencyDocument) {
    return {
      id: String(currency._id),
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      isActive: currency.isActive,
      isDefault: currency.isDefault,
      status: currency.isDefault ? 'DEFAULT' : currency.isActive ? 'ENABLED' : 'DISABLED',
    };
  }
}

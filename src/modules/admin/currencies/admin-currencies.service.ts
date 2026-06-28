import { Injectable, NotFoundException } from '@nestjs/common';
import { CurrenciesRepository } from '../../currencies/currencies.repository';
import type { AdminCurrencyDto, UpdateAdminCurrencyDto } from './dto/admin-currency.dto';

@Injectable()
export class AdminCurrenciesService {
  constructor(private readonly currenciesRepository: CurrenciesRepository) {}

  async listCurrencies() {
    const currencies = await this.currenciesRepository.find({});
    return { currencies };
  }

  async getCurrencyById(id: string) {
    const currency = await this.currenciesRepository.findById(id);
    if (!currency) throw new NotFoundException('Currency not found');
    return { currency };
  }

  async createCurrency(dto: AdminCurrencyDto) {
    if (dto.isDefault) await this.currenciesRepository.updateMany({}, { isDefault: false });
    const currency = await this.currenciesRepository.create({ ...dto, code: dto.code.toUpperCase().trim() });
    return { currency };
  }

  async updateCurrencyById(id: string, dto: UpdateAdminCurrencyDto) {
    const currency = await this.currenciesRepository.findById(id);
    if (!currency) throw new NotFoundException('Currency not found');
    if (dto.isDefault) await this.currenciesRepository.updateMany({}, { isDefault: false });
    Object.assign(currency, { ...dto, code: dto.code?.toUpperCase().trim() ?? currency.code });
    await currency.save();
    return { currency };
  }

  async setCurrencyDefault(id: string) {
    const currency = await this.currenciesRepository.findById(id);
    if (!currency) throw new NotFoundException('Currency not found');
    await this.currenciesRepository.updateMany({}, { isDefault: false });
    currency.isDefault = true;
    currency.isActive = true;
    await currency.save();
    return { currency };
  }

  async toggleCurrencyStatus(id: string, isActive?: boolean) {
    const currency = await this.currenciesRepository.findById(id);
    if (!currency) throw new NotFoundException('Currency not found');
    currency.isActive = typeof isActive === 'boolean' ? isActive : !currency.isActive;
    await currency.save();
    return { currency };
  }
}

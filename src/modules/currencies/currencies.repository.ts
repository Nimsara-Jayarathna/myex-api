import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model } from 'mongoose';
import { Currency, type CurrencyDocument } from './schemas/currency.schema';

@Injectable()
export class CurrenciesRepository {
  constructor(@InjectModel(Currency.name) private readonly currencyModel: Model<CurrencyDocument>) {}

  find(filter: FilterQuery<CurrencyDocument> = {}) {
    return this.currencyModel.find(filter).sort({ isDefault: -1, code: 1 });
  }

  findById(id: string) {
    return this.currencyModel.findById(id);
  }

  findDefault() {
    return this.currencyModel.findOne({ isDefault: true });
  }

  create(payload: Partial<Currency>) {
    return this.currencyModel.create(payload);
  }

  updateMany(filter: FilterQuery<CurrencyDocument>, payload: Partial<Currency>) {
    return this.currencyModel.updateMany(filter, payload);
  }
}

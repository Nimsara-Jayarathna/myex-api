import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Currency, CurrencySchema } from '../../currencies/schemas/currency.schema';
import { CurrenciesRepository } from '../../currencies/currencies.repository';
import { AdminCurrenciesService } from './admin-currencies.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Currency.name, schema: CurrencySchema }])],
  providers: [CurrenciesRepository, AdminCurrenciesService],
  exports: [AdminCurrenciesService],
})
export class AdminCurrenciesModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../../../../modules/auth/auth.module';
import { CategoriesModule } from '../../../../modules/categories/categories.module';
import { TransactionsModule } from '../../../../modules/transactions/transactions.module';
import { CurrenciesModule } from '../../../../modules/currencies/currencies.module';
import { AuthV11Controller } from './auth/auth-v1-1.controller';
import { AuthCompatV11Controller } from './auth/auth-v1-1-base.controller';
import { CurrenciesV11Controller } from './currencies/currencies-v1-1.controller';
import { CategoriesV11Controller } from './categories/categories-v1-1.controller';
import { TransactionsV11Controller } from './transactions/transactions-v1-1.controller';

@Module({
  imports: [AuthModule, CategoriesModule, TransactionsModule, CurrenciesModule],
  controllers: [AuthCompatV11Controller, AuthV11Controller, CurrenciesV11Controller, CategoriesV11Controller, TransactionsV11Controller],
})
export class V11Module {}

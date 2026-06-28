import { Module } from '@nestjs/common';
import { AuthModule } from '../../../../modules/auth/auth.module';
import { CategoriesModule } from '../../../../modules/categories/categories.module';
import { TransactionsModule } from '../../../../modules/transactions/transactions.module';
import { AuthV1Controller } from './auth/auth-v1.controller';
import { CategoriesV1Controller } from './categories/categories-v1.controller';
import { TransactionsV1Controller } from './transactions/transactions-v1.controller';

@Module({
  imports: [AuthModule, CategoriesModule, TransactionsModule],
  controllers: [AuthV1Controller, CategoriesV1Controller, TransactionsV1Controller],
})
export class V1Module {}

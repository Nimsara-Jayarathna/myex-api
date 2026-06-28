import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { Category, CategorySchema } from '../categories/schemas/category.schema';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsService } from './transactions.service';
import { CategoriesRepository } from '../categories/categories.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  providers: [TransactionsRepository, TransactionsService, CategoriesRepository],
  exports: [MongooseModule, TransactionsRepository, TransactionsService],
})
export class TransactionsModule {}

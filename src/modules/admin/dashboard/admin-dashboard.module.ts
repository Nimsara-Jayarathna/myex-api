import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../users/schemas/user.schema';
import { Transaction, TransactionSchema } from '../../transactions/schemas/transaction.schema';
import { Currency, CurrencySchema } from '../../currencies/schemas/currency.schema';
import { AdminAuditLog, AdminAuditLogSchema } from '../audit/schemas/admin-audit-log.schema';
import { AdminDashboardService } from './admin-dashboard.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Currency.name, schema: CurrencySchema },
      { name: AdminAuditLog.name, schema: AdminAuditLogSchema },
    ]),
  ],
  providers: [AdminDashboardService],
  exports: [AdminDashboardService],
})
export class AdminDashboardModule {}

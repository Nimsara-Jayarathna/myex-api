import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { User, type UserDocument } from '../../users/schemas/user.schema';
import {
  Transaction,
  type TransactionDocument,
} from '../../transactions/schemas/transaction.schema';

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  async getDashboard() {
    const [users, activeUsers, transactions, totals] = await Promise.all([
      this.userModel.countDocuments({}),
      this.userModel.countDocuments({ status: 'ACTIVE' }),
      this.transactionModel.countDocuments({}),
      this.transactionModel.aggregate([{ $group: { _id: '$type', total: { $sum: '$amount' } } }]),
    ]);
    return { users, activeUsers, transactions, totals };
  }
}

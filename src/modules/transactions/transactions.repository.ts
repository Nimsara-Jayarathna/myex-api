import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, PipelineStage, SortOrder, Types } from 'mongoose';
import { Transaction, type TransactionDocument } from './schemas/transaction.schema';

@Injectable()
export class TransactionsRepository {
  constructor(
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  create(payload: Partial<Transaction>) {
    return this.transactionModel.create(payload);
  }

  find(filter: FilterQuery<TransactionDocument>, sort: Record<string, SortOrder>, skip?: number, limit?: number) {
    const query = this.transactionModel.find(filter).sort(sort).lean();
    if (skip !== undefined && limit !== undefined) query.skip(skip).limit(limit);
    return query;
  }

  count(filter: FilterQuery<TransactionDocument>) {
    return this.transactionModel.countDocuments(filter);
  }

  findOne(filter: FilterQuery<TransactionDocument>) {
    return this.transactionModel.findOne(filter);
  }

  findById(id: string | Types.ObjectId) {
    return this.transactionModel.findById(id);
  }

  aggregate<T>(pipeline: PipelineStage[]) {
    return this.transactionModel.aggregate<T>(pipeline);
  }
}

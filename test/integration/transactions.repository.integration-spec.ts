import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { TransactionSchema } from '../../src/modules/transactions/schemas/transaction.schema';

describe('Transaction repository integration shape', () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    mongoose.model('Transaction', TransactionSchema);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('creates a transaction document', async () => {
    const Transaction = mongoose.model('Transaction');
    const transaction = await Transaction.create({
      user: new mongoose.Types.ObjectId(),
      type: 'income',
      category: 'Sales',
      amount: 100,
    });
    expect(transaction.amount).toBe(100);
  });
});

import type { Connection } from 'mongoose';

export default {
  id: '20260628-backfill-default-currency',
  async up(connection: Connection): Promise<void> {
    const currencies = connection.collection('currencies');
    let defaultCurrency = await currencies.findOne({ isDefault: true });
    if (!defaultCurrency) {
      const result = await currencies.insertOne({
        name: 'US Dollar',
        code: 'USD',
        symbol: '$',
        isDefault: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      defaultCurrency = { _id: result.insertedId };
    }
    await connection.collection('users').updateMany(
      { $or: [{ currency: { $exists: false } }, { currency: null }] },
      { $set: { currency: defaultCurrency._id } },
    );
  },
  async down(): Promise<void> {
    // Non-destructive rollback: keep assigned currency values.
  },
};

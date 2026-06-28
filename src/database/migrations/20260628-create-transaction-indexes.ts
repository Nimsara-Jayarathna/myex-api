import type { Connection } from 'mongoose';

export default {
  id: '20260628-create-transaction-indexes',
  async up(connection: Connection): Promise<void> {
    await connection.collection('transactions').createIndex({ user: 1, date: -1 });
    await connection.collection('transactions').createIndex({ user: 1, status: 1 });
  },
  async down(connection: Connection): Promise<void> {
    await connection
      .collection('transactions')
      .dropIndex('user_1_date_-1')
      .catch(() => undefined);
    await connection
      .collection('transactions')
      .dropIndex('user_1_status_1')
      .catch(() => undefined);
  },
};

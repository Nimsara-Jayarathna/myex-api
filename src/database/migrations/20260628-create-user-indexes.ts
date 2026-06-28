import type { Connection } from 'mongoose';

export default {
  id: '20260628-create-user-indexes',
  async up(connection: Connection): Promise<void> {
    await connection.collection('users').createIndex({ email: 1 }, { unique: true });
    await connection.collection('users').createIndex({ status: 1 });
  },
  async down(connection: Connection): Promise<void> {
    await connection
      .collection('users')
      .dropIndex('email_1')
      .catch(() => undefined);
    await connection
      .collection('users')
      .dropIndex('status_1')
      .catch(() => undefined);
  },
};

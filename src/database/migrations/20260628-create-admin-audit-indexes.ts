import type { Connection } from 'mongoose';

export default {
  id: '20260628-create-admin-audit-indexes',
  async up(connection: Connection): Promise<void> {
    await connection.collection('adminauditlogs').createIndex({ createdAt: -1 });
    await connection.collection('adminauditlogs').createIndex({ adminEmail: 1 });
    await connection.collection('adminauditlogs').createIndex({ path: 1 });
  },
  async down(connection: Connection): Promise<void> {
    await connection.collection('adminauditlogs').dropIndex('createdAt_-1').catch(() => undefined);
    await connection.collection('adminauditlogs').dropIndex('adminEmail_1').catch(() => undefined);
    await connection.collection('adminauditlogs').dropIndex('path_1').catch(() => undefined);
  },
};

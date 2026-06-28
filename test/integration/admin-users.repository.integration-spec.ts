import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { AdminUserSchema } from '../../src/modules/admin/auth/schemas/admin-user.schema';

describe('Admin user repository integration shape', () => {
  let mongo: MongoMemoryServer;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    mongoose.model('AdminUser', AdminUserSchema);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo.stop();
  });

  it('creates an admin user document', async () => {
    const AdminUser = mongoose.model('AdminUser');
    const admin = await AdminUser.create({ email: 'admin@example.com', passwordHash: 'hash' });
    expect(admin.roles).toContain('super_admin');
  });
});

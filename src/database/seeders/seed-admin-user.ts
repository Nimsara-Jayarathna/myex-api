import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { AdminUserSchema } from '../../modules/admin/auth/schemas/admin-user.schema';
import { logger, hashEmail } from '../../common/utils/logger';

async function main(): Promise<void> {
  const seedEmail = process.env.ADMIN_SEED_EMAIL?.toLowerCase().trim();
  const seedPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!seedEmail || !seedPassword) {
    logger.info({
      message: 'Admin bootstrap skipped: set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD.',
    });
    return;
  }
  await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://localhost:27017/blipzo');
  const AdminUser = mongoose.model('AdminUser', AdminUserSchema);
  const existing = await AdminUser.findOne({ email: seedEmail }).select('_id');
  if (existing) {
    logger.info({
      message: 'Admin bootstrap skipped: seed admin already exists.',
      adminEmailHash: hashEmail(seedEmail),
    });
    await mongoose.disconnect();
    return;
  }
  const passwordHash = await bcrypt.hash(seedPassword, Number(process.env.BCRYPT_ROUNDS ?? 10));
  await AdminUser.create({
    email: seedEmail,
    passwordHash,
    roles: ['super_admin'],
    isActive: true,
  });
  logger.info({ message: 'Admin bootstrap completed.', adminEmailHash: hashEmail(seedEmail) });
  await mongoose.disconnect();
}

void main();

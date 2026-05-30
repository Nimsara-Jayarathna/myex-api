import bcrypt from "bcrypt";
import AdminUser from "../models/AdminUser.js";
import { hashEmail, logger } from "./logger.js";

const SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 10;

export const seedAdminUser = async () => {
  const seedEmail = process.env.ADMIN_SEED_EMAIL?.toLowerCase().trim();
  const seedPassword = process.env.ADMIN_SEED_PASSWORD;

  if (!seedEmail || !seedPassword) {
    logger.info({
      message:
        "Admin bootstrap skipped: set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD to enable.",
    });
    return;
  }

  const existing = await AdminUser.findOne({ email: seedEmail }).select("_id");
  if (existing) {
    logger.info({
      message: "Admin bootstrap skipped: seed admin already exists.",
      adminEmailHash: hashEmail(seedEmail),
    });
    return;
  }

  const passwordHash = await bcrypt.hash(seedPassword, SALT_ROUNDS);
  await AdminUser.create({
    email: seedEmail,
    passwordHash,
    roles: ["super_admin"],
    isActive: true,
  });

  logger.info({
    message: "Admin bootstrap completed.",
    adminEmailHash: hashEmail(seedEmail),
  });
};

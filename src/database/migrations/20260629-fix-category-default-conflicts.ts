/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import type { Connection } from 'mongoose';

const CATEGORY_COLLECTION = 'categories';
const POLICY_COLLECTION = 'admincategorypolicies';
const CATEGORY_TYPES = ['income', 'expense'] as const;

type CategoryType = (typeof CATEGORY_TYPES)[number];

type CategoryRecord = {
  _id: any;
  user?: any;
  type: CategoryType;
  name: string;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

async function keepOnlyOneDefault(
  connection: Connection,
  filter: Record<string, unknown>,
): Promise<CategoryRecord | null> {
  const categories = (await connection
    .collection<CategoryRecord>(CATEGORY_COLLECTION)
    .find({ ...filter, isActive: true, isDefault: true })
    .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
    .toArray()) as CategoryRecord[];

  const keep = categories[0] ?? null;
  if (!keep) return null;

  await connection.collection(CATEGORY_COLLECTION).updateMany(
    { ...filter, isDefault: true, _id: { $ne: keep._id } },
    { $set: { isDefault: false } },
  );

  return keep;
}

async function ensureGlobalDefault(connection: Connection, type: CategoryType): Promise<CategoryRecord | null> {
  const existingDefault = await keepOnlyOneDefault(connection, { user: null, type });
  if (existingDefault) return existingDefault;

  const replacement = (await connection
    .collection<CategoryRecord>(CATEGORY_COLLECTION)
    .find({ user: null, type, isActive: true })
    .sort({ updatedAt: -1, createdAt: -1, _id: -1 })
    .limit(1)
    .next()) as CategoryRecord | null;

  if (!replacement) return null;

  await connection
    .collection(CATEGORY_COLLECTION)
    .updateOne({ _id: replacement._id }, { $set: { isDefault: true, isActive: true } });

  return { ...replacement, isDefault: true, isActive: true };
}

async function cleanupUserDefaults(connection: Connection): Promise<void> {
  await connection
    .collection(CATEGORY_COLLECTION)
    .updateMany({ isActive: false, isDefault: true }, { $set: { isDefault: false } });

  const duplicateGroups = await connection
    .collection(CATEGORY_COLLECTION)
    .aggregate([
      {
        $match: {
          user: { $ne: null },
          isActive: true,
          isDefault: true,
          type: { $in: [...CATEGORY_TYPES] },
        },
      },
      {
        $group: {
          _id: { user: '$user', type: '$type' },
          count: { $sum: 1 },
          ids: { $push: '$_id' },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  for (const group of duplicateGroups) {
    const user = group._id.user;
    const type = group._id.type as CategoryType;
    await keepOnlyOneDefault(connection, { user, type });
  }
}

async function cleanupGlobalDefaultsAndPolicy(connection: Connection): Promise<void> {
  const defaultsByType = new Map<CategoryType, CategoryRecord>();

  for (const type of CATEGORY_TYPES) {
    const defaultCategory = await ensureGlobalDefault(connection, type);
    if (defaultCategory) defaultsByType.set(type, defaultCategory);
  }

  const update: Record<string, string> = {};
  const incomeDefault = defaultsByType.get('income');
  const expenseDefault = defaultsByType.get('expense');

  if (incomeDefault?.name) update.defaultIncomeCategoryName = incomeDefault.name;
  if (expenseDefault?.name) update.defaultExpenseCategoryName = expenseDefault.name;

  if (Object.keys(update).length > 0) {
    await connection.collection(POLICY_COLLECTION).updateOne(
      { scope: 'global' },
      {
        $set: update,
        $setOnInsert: {
          scope: 'global',
          defaultCategoryLimit: 10,
        },
      },
      { upsert: true },
    );
  }
}

export default {
  id: '20260629-fix-category-default-conflicts',
  async up(connection: Connection): Promise<void> {
    await cleanupUserDefaults(connection);
    await cleanupGlobalDefaultsAndPolicy(connection);

    await connection.collection(CATEGORY_COLLECTION).createIndex(
      { user: 1, type: 1 },
      {
        unique: true,
        name: 'uniq_user_active_default_category_per_type',
        partialFilterExpression: {
          isDefault: true,
          isActive: true,
          user: { $type: 'objectId' },
        },
      },
    );

    await connection.collection(CATEGORY_COLLECTION).createIndex(
      { type: 1 },
      {
        unique: true,
        name: 'uniq_global_active_default_category_per_type',
        partialFilterExpression: {
          user: null,
          isDefault: true,
          isActive: true,
        },
      },
    );
  },
  async down(connection: Connection): Promise<void> {
    await connection
      .collection(CATEGORY_COLLECTION)
      .dropIndex('uniq_user_active_default_category_per_type')
      .catch(() => undefined);
    await connection
      .collection(CATEGORY_COLLECTION)
      .dropIndex('uniq_global_active_default_category_per_type')
      .catch(() => undefined);
  },
};

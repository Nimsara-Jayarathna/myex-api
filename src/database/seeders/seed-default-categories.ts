import mongoose from 'mongoose';
import { CategorySchema } from '../../modules/categories/schemas/category.schema';
import { logger } from '../../common/utils/logger';

const defaultCategories = [
  { name: 'Sales', type: 'income', isDefault: true, isActive: true, user: null },
  { name: 'Stock', type: 'expense', isDefault: true, isActive: true, user: null },
];

async function main(): Promise<void> {
  await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://localhost:27017/blipzo');
  const Category = mongoose.model('Category', CategorySchema);
  for (const category of defaultCategories) {
    await Category.updateOne(
      { user: null, type: category.type, name: category.name },
      { $setOnInsert: category },
      { upsert: true },
    );
  }
  logger.info({ message: 'Default categories seeded.' });
  await mongoose.disconnect();
}

void main();

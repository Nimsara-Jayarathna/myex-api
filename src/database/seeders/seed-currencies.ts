import mongoose from 'mongoose';
import { CurrencySchema } from '../../modules/currencies/schemas/currency.schema';
import { UserSchema } from '../../modules/users/schemas/user.schema';
import { logger } from '../../common/utils/logger';

const currencies = [
  { name: 'US Dollar', code: 'USD', symbol: '$', isDefault: true, isActive: true },
  { name: 'Sri Lankan Rupee', code: 'LKR', symbol: 'Rs', isDefault: false, isActive: true },
];

async function main(): Promise<void> {
  await mongoose.connect(process.env.MONGO_URI ?? 'mongodb://localhost:27017/blipzo');
  const Currency = mongoose.model('Currency', CurrencySchema);
  const User = mongoose.model('User', UserSchema);

  for (const currency of currencies) {
    const existing = await Currency.findOne({ code: currency.code });
    if (!existing) await Currency.create(currency);
    else if (currency.isDefault && !existing.isDefault) {
      await Currency.updateMany({}, { isDefault: false });
      existing.isDefault = true;
      await existing.save();
    }
  }

  const defaultCurrency = await Currency.findOne({ isDefault: true });
  if (defaultCurrency) {
    await User.updateMany(
      { $or: [{ currency: { $exists: false } }, { currency: null }] },
      { $set: { currency: defaultCurrency._id } },
    );
  }
  logger.info({ message: 'Currencies seeded.' });
  await mongoose.disconnect();
}

void main();

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Currency, CurrencySchema } from './schemas/currency.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { CurrenciesRepository } from './currencies.repository';
import { CurrenciesService } from './currencies.service';
import { UsersRepository } from '../users/users.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Currency.name, schema: CurrencySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [CurrenciesRepository, CurrenciesService, UsersRepository],
  exports: [MongooseModule, CurrenciesRepository, CurrenciesService],
})
export class CurrenciesModule {}

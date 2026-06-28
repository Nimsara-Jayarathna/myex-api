import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { Currency, CurrencySchema } from '../currencies/schemas/currency.schema';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Currency.name, schema: CurrencySchema },
    ]),
  ],
  providers: [UsersRepository, UsersService],
  exports: [MongooseModule, UsersRepository, UsersService],
})
export class UsersModule {}

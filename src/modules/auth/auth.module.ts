import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Token, TokenSchema } from './schemas/token.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Currency, CurrencySchema } from '../currencies/schemas/currency.schema';
import { Category, CategorySchema } from '../categories/schemas/category.schema';
import {
  AdminCategoryPolicy,
  AdminCategoryPolicySchema,
} from '../admin/categories/schemas/admin-category-policy.schema';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { UsersRepository } from '../users/users.repository';
import { CurrenciesRepository } from '../currencies/currencies.repository';
import { CategoryDefaultsService } from '../categories/category-defaults.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    EmailModule,
    MongooseModule.forFeature([
      { name: Token.name, schema: TokenSchema },
      { name: User.name, schema: UserSchema },
      { name: Currency.name, schema: CurrencySchema },
      { name: Category.name, schema: CategorySchema },
      { name: AdminCategoryPolicy.name, schema: AdminCategoryPolicySchema },
    ]),
  ],
  providers: [
    AuthRepository,
    AuthService,
    UsersRepository,
    CurrenciesRepository,
    CategoryDefaultsService,
  ],
  exports: [MongooseModule, AuthRepository, AuthService],
})
export class AuthModule {}

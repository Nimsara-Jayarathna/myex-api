import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import mailConfig from './config/mail.config';
import validationConfig from './config/validation.config';
import { DatabaseModule } from './database/database.module';
import { PublicApiModule } from './interfaces/http/public/public-api.module';
import { AdminApiModule } from './interfaces/http/admin/admin-api.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CurrenciesModule } from './modules/currencies/currencies.module';
import { EmailModule } from './modules/email/email.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, mailConfig, validationConfig],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    TransactionsModule,
    CategoriesModule,
    CurrenciesModule,
    EmailModule,
    JobsModule,
    AdminModule,
    PublicApiModule,
    AdminApiModule,
  ],
})
export class AppModule {}

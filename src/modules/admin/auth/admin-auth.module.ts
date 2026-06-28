import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminUser, AdminUserSchema } from './schemas/admin-user.schema';
import { AdminOtpChallenge, AdminOtpChallengeSchema } from './schemas/admin-otp-challenge.schema';
import { AdminAuthRepository } from './admin-auth.repository';
import { AdminAuthService } from './admin-auth.service';
import { EmailModule } from '../../email/email.module';

@Module({
  imports: [
    EmailModule,
    MongooseModule.forFeature([
      { name: AdminUser.name, schema: AdminUserSchema },
      { name: AdminOtpChallenge.name, schema: AdminOtpChallengeSchema },
    ]),
  ],
  providers: [AdminAuthRepository, AdminAuthService],
  exports: [MongooseModule, AdminAuthRepository, AdminAuthService],
})
export class AdminAuthModule {}

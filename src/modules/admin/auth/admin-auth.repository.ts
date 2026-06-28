import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AdminUser, type AdminUserDocument } from './schemas/admin-user.schema';
import { AdminOtpChallenge, type AdminOtpChallengeDocument } from './schemas/admin-otp-challenge.schema';

@Injectable()
export class AdminAuthRepository {
  constructor(
    @InjectModel(AdminUser.name) private readonly adminModel: Model<AdminUserDocument>,
    @InjectModel(AdminOtpChallenge.name)
    private readonly otpModel: Model<AdminOtpChallengeDocument>,
  ) {}

  findByEmailWithPassword(email: string) {
    return this.adminModel.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
  }

  findById(id: string) {
    return this.adminModel.findById(id);
  }

  createOtp(payload: Partial<AdminOtpChallenge>) {
    return this.otpModel.create(payload);
  }

  findOtpByHash(challengeTokenHash: string) {
    return this.otpModel.findOne({ challengeTokenHash });
  }
}

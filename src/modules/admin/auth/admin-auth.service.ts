import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AdminAuthRepository } from './admin-auth.repository';
import { EmailService } from '../../email/email.service';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly adminAuthRepository: AdminAuthRepository,
    private readonly emailService: EmailService,
  ) {}

  async login(email: string, password: string) {
    const admin = await this.adminAuthRepository.findByEmailWithPassword(email);
    if (!admin || !admin.isActive) throw new UnauthorizedException('Invalid admin credentials');
    const matches = await bcrypt.compare(password, admin.passwordHash);
    if (!matches) throw new UnauthorizedException('Invalid admin credentials');

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const challengeToken = crypto.randomBytes(32).toString('hex');
    const challengeTokenHash = this.hash(challengeToken);
    const otpHash = await bcrypt.hash(otp, Number(process.env.BCRYPT_ROUNDS ?? 10));
    await this.adminAuthRepository.createOtp({
      adminId: admin._id,
      email: admin.email,
      challengeTokenHash,
      otpHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await this.emailService.sendOtp(admin.email, otp);
    return { challengeToken, email: admin.email };
  }

  async verifyOtp(challengeToken: string, otp: string) {
    const challenge = await this.adminAuthRepository.findOtpByHash(this.hash(challengeToken));
    if (!challenge || challenge.status !== 'pending') throw new BadRequestException('Invalid OTP challenge');
    if (challenge.expiresAt < new Date()) {
      challenge.status = 'expired';
      await challenge.save();
      throw new BadRequestException('OTP challenge expired');
    }
    const matches = await bcrypt.compare(otp, challenge.otpHash);
    if (!matches) {
      challenge.attemptCount += 1;
      if (challenge.attemptCount >= challenge.maxAttempts) challenge.status = 'locked';
      await challenge.save();
      throw new UnauthorizedException('Invalid OTP');
    }
    challenge.status = 'consumed';
    challenge.usedAt = new Date();
    await challenge.save();

    const admin = await this.adminAuthRepository.findById(String(challenge.adminId));
    if (!admin || !admin.isActive) throw new UnauthorizedException('Admin account is inactive');
    admin.lastLoginAt = new Date();
    await admin.save();

    const expiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as `${number}${'s' | 'm' | 'h' | 'd' | 'w'}`;
    const accessToken = jwt.sign(
      { adminId: String(admin._id), type: 'admin' },
      process.env.JWT_ACCESS_SECRET ?? 'local-access-secret',
      { expiresIn },
    );
    return {
      admin: this.sanitizeAdmin(admin),
      accessToken,
      session: { accessTokenExpiresInSeconds: 15 * 60 },
    };
  }

  async resendOtp(challengeToken: string) {
    const challenge = await this.adminAuthRepository.findOtpByHash(this.hash(challengeToken));
    if (!challenge || challenge.status !== 'pending') throw new BadRequestException('Invalid OTP challenge');
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    challenge.otpHash = await bcrypt.hash(otp, Number(process.env.BCRYPT_ROUNDS ?? 10));
    challenge.resendCount += 1;
    await challenge.save();
    await this.emailService.sendOtp(challenge.email, otp);
    return { email: challenge.email, resendCount: challenge.resendCount };
  }

  async otpStatus(challengeToken: string) {
    const challenge = await this.adminAuthRepository.findOtpByHash(this.hash(challengeToken));
    if (!challenge) throw new BadRequestException('Invalid OTP challenge');
    return { status: challenge.status, expiresAt: challenge.expiresAt, attemptCount: challenge.attemptCount };
  }

  async cancelOtp(challengeToken: string) {
    const challenge = await this.adminAuthRepository.findOtpByHash(this.hash(challengeToken));
    if (!challenge) throw new BadRequestException('Invalid OTP challenge');
    challenge.status = 'cancelled';
    challenge.invalidatedAt = new Date();
    await challenge.save();
    return { status: challenge.status };
  }

  sanitizeAdmin(admin: { [key: string]: any }) {
    return {
      id: admin._id,
      email: admin.email,
      roles: admin.roles,
      isActive: admin.isActive,
      lastLoginAt: admin.lastLoginAt,
    };
  }

  private hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}

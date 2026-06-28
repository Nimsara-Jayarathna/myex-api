import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AdminAuthRepository } from './admin-auth.repository';
import { EmailService } from '../../email/email.service';
import type { AdminOtpChallengeDocument } from './schemas/admin-otp-challenge.schema';

export interface AdminOtpChallengeStatus {
  challengeId: string;
  maskedEmail: string;
  otpExpiresInSeconds: number;
  remainingAttempts: number;
  maxAttempts: number;
  lockoutRemainingSeconds: number;
  resendAvailableInSeconds: number;
  status: 'pending' | 'verified' | 'expired' | 'locked' | 'consumed' | 'cancelled';
}

export interface AdminLoginOtpChallenge extends AdminOtpChallengeStatus {
  otpRequired: true;
  challengeToken: string;
}

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly adminAuthRepository: AdminAuthRepository,
    private readonly emailService: EmailService,
  ) {}

  async login(email: string, password: string): Promise<AdminLoginOtpChallenge> {
    const admin = await this.adminAuthRepository.findByEmailWithPassword(email);
    if (!admin || !admin.isActive) throw new UnauthorizedException('Invalid admin credentials');
    const matches = await bcrypt.compare(password, admin.passwordHash);
    if (!matches) throw new UnauthorizedException('Invalid admin credentials');

    await this.adminAuthRepository.cancelPendingOtpForAdmin(String(admin._id));

    const otp = this.generateOtp();
    const challengeToken = crypto.randomBytes(32).toString('hex');
    const challengeTokenHash = this.hash(challengeToken);
    const otpHash = await bcrypt.hash(otp, Number(process.env.BCRYPT_ROUNDS ?? 10));
    const challenge = await this.adminAuthRepository.createOtp({
      adminId: admin._id,
      email: admin.email,
      challengeTokenHash,
      otpHash,
      expiresAt: new Date(Date.now() + this.otpTtlMs()),
      resendAvailableAt: new Date(Date.now() + this.otpResendCooldownMs()),
    });

    await this.emailService.sendOtp(admin.email, otp);

    return {
      otpRequired: true,
      challengeToken,
      ...this.toOtpChallengeStatus(challenge),
    };
  }

  async verifyOtp(challengeToken: string | undefined, otp: string) {
    const challenge = await this.getPendingChallenge(challengeToken);
    const matches = await bcrypt.compare(otp, challenge.otpHash);
    if (!matches) {
      challenge.attemptCount += 1;
      if (challenge.attemptCount >= challenge.maxAttempts) {
        challenge.status = 'locked';
        challenge.lockedUntil = challenge.expiresAt;
      }
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

    const expiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ??
      '15m') as `${number}${'s' | 'm' | 'h' | 'd' | 'w'}`;
    const accessToken = jwt.sign(
      { adminId: String(admin._id), type: 'admin' },
      process.env.JWT_ACCESS_SECRET ?? 'local-access-secret',
      { expiresIn },
    );
    return {
      admin: this.sanitizeAdmin(admin),
      accessToken,
      session: { accessTokenExpiresInSeconds: this.accessTokenTtlSeconds() },
    };
  }

  async resendOtp(challengeToken: string | undefined): Promise<AdminOtpChallengeStatus> {
    const challenge = await this.getPendingChallenge(challengeToken);
    const now = Date.now();
    const resendAvailableAt = challenge.resendAvailableAt?.getTime?.() ?? 0;
    if (resendAvailableAt > now) {
      throw new BadRequestException('Please wait before requesting another OTP');
    }

    const otp = this.generateOtp();
    challenge.otpHash = await bcrypt.hash(otp, Number(process.env.BCRYPT_ROUNDS ?? 10));
    challenge.resendCount += 1;
    challenge.expiresAt = new Date(now + this.otpTtlMs());
    challenge.resendAvailableAt = new Date(now + this.otpResendCooldownMs());
    await challenge.save();
    await this.emailService.sendOtp(challenge.email, otp);

    return this.toOtpChallengeStatus(challenge);
  }

  async otpStatus(challengeToken: string | undefined): Promise<AdminOtpChallengeStatus> {
    const challenge = await this.adminAuthRepository.findOtpByHash(
      this.hashRequiredToken(challengeToken),
    );
    if (!challenge) throw new BadRequestException('Invalid OTP challenge');

    if (challenge.status === 'pending' && challenge.expiresAt < new Date()) {
      challenge.status = 'expired';
      await challenge.save();
    }

    return this.toOtpChallengeStatus(challenge);
  }

  async cancelOtp(challengeToken: string | undefined): Promise<AdminOtpChallengeStatus> {
    const challenge = await this.adminAuthRepository.findOtpByHash(
      this.hashRequiredToken(challengeToken),
    );
    if (!challenge) throw new BadRequestException('Invalid OTP challenge');
    if (challenge.status === 'pending') {
      challenge.status = 'cancelled';
      challenge.invalidatedAt = new Date();
      await challenge.save();
    }
    return this.toOtpChallengeStatus(challenge);
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

  private async getPendingChallenge(
    challengeToken: string | undefined,
  ): Promise<AdminOtpChallengeDocument> {
    const challenge = await this.adminAuthRepository.findOtpByHash(
      this.hashRequiredToken(challengeToken),
    );
    if (!challenge) throw new BadRequestException('Invalid OTP challenge');

    if (challenge.status !== 'pending') {
      throw new BadRequestException('Invalid OTP challenge');
    }

    if (challenge.expiresAt < new Date()) {
      challenge.status = 'expired';
      await challenge.save();
      throw new BadRequestException('OTP challenge expired');
    }

    return challenge;
  }

  private toOtpChallengeStatus(challenge: AdminOtpChallengeDocument): AdminOtpChallengeStatus {
    return {
      challengeId: String(challenge._id),
      maskedEmail: this.maskEmail(challenge.email),
      otpExpiresInSeconds: this.secondsUntil(challenge.expiresAt),
      remainingAttempts: Math.max(0, challenge.maxAttempts - challenge.attemptCount),
      maxAttempts: challenge.maxAttempts,
      lockoutRemainingSeconds: challenge.lockedUntil ? this.secondsUntil(challenge.lockedUntil) : 0,
      resendAvailableInSeconds: challenge.resendAvailableAt
        ? this.secondsUntil(challenge.resendAvailableAt)
        : 0,
      status: challenge.status,
    };
  }

  private maskEmail(email: string): string {
    const [localPart = '', domain = ''] = email.split('@');
    if (!domain) return email;
    const first = localPart.charAt(0);
    const last = localPart.length > 2 ? localPart.charAt(localPart.length - 1) : '';
    const middleLength = Math.max(localPart.length - first.length - last.length, 3);
    return `${first}${'*'.repeat(middleLength)}${last}@${domain}`;
  }

  private secondsUntil(date: Date): number {
    return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000));
  }

  private hashRequiredToken(value: string | undefined): string {
    if (!value) throw new BadRequestException('Invalid OTP challenge');
    return this.hash(value);
  }

  private hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  private generateOtp(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private otpTtlMs(): number {
    return Number(process.env.ADMIN_OTP_TTL_SECONDS ?? 10 * 60) * 1000;
  }

  private otpResendCooldownMs(): number {
    return Number(process.env.ADMIN_OTP_RESEND_COOLDOWN_SECONDS ?? 60) * 1000;
  }

  private accessTokenTtlSeconds(): number {
    const configured = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
    const match = configured.match(/^(\d+)([smhdw])$/);
    if (!match) return 15 * 60;

    const value = Number(match[1]);
    const unit = match[2];
    if (unit === 's') return value;
    if (unit === 'm') return value * 60;
    if (unit === 'h') return value * 60 * 60;
    if (unit === 'd') return value * 24 * 60 * 60;
    if (unit === 'w') return value * 7 * 24 * 60 * 60;
    return 15 * 60;
  }
}

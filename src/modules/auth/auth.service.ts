import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { AuthRepository } from './auth.repository';
import { UsersRepository } from '../users/users.repository';
import { CurrenciesRepository } from '../currencies/currencies.repository';
import { CategoryDefaultsService } from '../categories/category-defaults.service';
import { EmailService } from '../email/email.service';
import { issueTokens, verifyAccessToken, verifyRefreshToken } from '../../common/utils/auth-tokens';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { UserDocument } from '../users/schemas/user.schema';

type PopulatedCurrency = {
  _id: Types.ObjectId;
  name: string;
  code: string;
  symbol: string;
};

type UserWithMaybePopulatedCurrency = UserDocument & {
  currency?: Types.ObjectId | PopulatedCurrency;
};

function isPopulatedCurrency(
  currency: Types.ObjectId | PopulatedCurrency,
): currency is PopulatedCurrency {
  return 'name' in currency && 'code' in currency && 'symbol' in currency;
}

@Injectable()
export class AuthService {
  private readonly saltRounds: number;

  constructor(
    private readonly config: ConfigService,
    private readonly usersRepository: UsersRepository,
    private readonly currenciesRepository: CurrenciesRepository,
    private readonly categoryDefaultsService: CategoryDefaultsService,
    private readonly authRepository: AuthRepository,
    private readonly emailService: EmailService,
  ) {
    this.saltRounds = this.config.get<number>('bcryptRounds') ?? 10;
  }

  async registerUser(dto: RegisterDto) {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email is already registered');

    const password = await bcrypt.hash(dto.password, this.saltRounds);
    const defaults = await this.categoryDefaultsService.getRegistrationDefaults();
    const user = await this.usersRepository.create({
      name: dto.name,
      fname: dto.fname,
      lname: dto.lname,
      email: dto.email.toLowerCase().trim(),
      password,
      status: 'ACTIVE',
      tokenVersion: 0,
      categoryLimit: defaults.categoryLimit,
      defaultIncomeCategories: [defaults.incomeName],
      defaultExpenseCategories: [defaults.expenseName],
    });

    const defaultCurrency = await this.currenciesRepository.findDefault();
    if (defaultCurrency) {
      user.currency = defaultCurrency._id;
      await user.save();
    }

    await this.categoryDefaultsService.ensureUserDefaultCategories(
      user._id,
      defaults.incomeName,
      defaults.expenseName,
    );

    return { user, tokens: issueTokens(String(user._id), user.tokenVersion ?? 0) };
  }

  async loginUser(dto: LoginDto) {
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) throw new UnauthorizedException('Invalid credentials');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('User account is not active');

    const defaults = await this.categoryDefaultsService.getRegistrationDefaults();
    await this.categoryDefaultsService.ensureUserDefaultCategories(
      user._id,
      defaults.incomeName,
      defaults.expenseName,
    );

    user.lastLoginAt = new Date();
    await user.save();

    return { user, tokens: issueTokens(String(user._id), user.tokenVersion ?? 0) };
  }

  async getUserSession(token?: string) {
    if (!token) throw new UnauthorizedException('Access token missing');
    const decoded = verifyAccessToken(token);
    const user = await this.usersRepository.findById(decoded.userId);
    if (!user) throw new UnauthorizedException('User not found for this token');
    if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      throw new UnauthorizedException('Session expired');
    }
    return user;
  }

  async refreshUserSession(refreshToken?: string) {
    if (!refreshToken) throw new UnauthorizedException('Refresh token missing');
    const decoded = verifyRefreshToken(refreshToken);
    const user = await this.usersRepository.findById(decoded.userId);
    if (!user) throw new UnauthorizedException('User not found for this token');
    if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      throw new UnauthorizedException('Session expired');
    }
    return { user, tokens: issueTokens(String(user._id), user.tokenVersion ?? 0) };
  }

  async registerInit(email: string) {
    const existing = await this.usersRepository.findByEmail(email);
    if (existing) throw new ConflictException('Email is already registered');
    const otp = this.generateOtp();
    await this.authRepository.createToken({
      email: email.toLowerCase().trim(),
      token: otp,
      type: 'register_otp',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await this.emailService.sendOtp(email, otp);
    return { email };
  }

  async registerVerify(email: string, otp: string) {
    const token = await this.authRepository.findToken(otp, 'register_otp');
    if (!token || token.email !== email.toLowerCase().trim()) {
      throw new BadRequestException('Invalid or expired OTP');
    }
    await this.authRepository.deleteToken(otp);
    const verifiedToken = crypto.randomBytes(32).toString('hex');
    await this.authRepository.createToken({
      email: email.toLowerCase().trim(),
      token: verifiedToken,
      type: 'registration_verified',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    return { registrationToken: verifiedToken };
  }

  async registerComplete(dto: RegisterDto & { registrationToken?: string }) {
    if (!dto.registrationToken) throw new BadRequestException('registrationToken is required');
    const verified = await this.authRepository.findToken(
      dto.registrationToken,
      'registration_verified',
    );
    if (!verified || verified.email !== dto.email.toLowerCase().trim()) {
      throw new BadRequestException('Invalid or expired registration token');
    }
    await this.authRepository.deleteToken(dto.registrationToken);
    return this.registerUser(dto);
  }

  async forgotPassword(email: string) {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) return { email };
    const resetToken = crypto.randomBytes(32).toString('hex');
    await this.authRepository.createToken({
      userId: user._id,
      email: user.email,
      token: resetToken,
      type: 'reset_token',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await this.emailService.sendPasswordReset(user.email, resetToken);
    return { email };
  }

  async resetPassword(token: string, password: string) {
    const resetToken = await this.authRepository.findToken(token, 'reset_token');
    if (!resetToken?.userId) throw new BadRequestException('Invalid or expired reset token');
    const user = await this.usersRepository.findByIdWithPassword(resetToken.userId);
    if (!user) throw new NotFoundException('User not found');
    user.password = await bcrypt.hash(password, this.saltRounds);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();
    await this.authRepository.deleteToken(token);
    return { user: this.sanitizeUser(user) };
  }

  async changePassword(user: UserDocument, currentPassword: string, newPassword: string) {
    const fullUser = await this.usersRepository.findByIdWithPassword(user._id);
    if (!fullUser) throw new NotFoundException('User not found');
    const matches = await bcrypt.compare(currentPassword, fullUser.password);
    if (!matches) throw new UnauthorizedException('Current password is incorrect');
    fullUser.password = await bcrypt.hash(newPassword, this.saltRounds);
    fullUser.tokenVersion = (fullUser.tokenVersion ?? 0) + 1;
    await fullUser.save();
    return { user: this.sanitizeUser(fullUser) };
  }

  async updateUserDetails(
    user: UserDocument,
    payload: { name?: string; fname?: string; lname?: string },
  ) {
    const updated = await this.usersRepository.updateById(String(user._id), payload);
    return { user: updated ? this.sanitizeUser(updated as UserDocument) : null };
  }

  sanitizeUser(user: UserWithMaybePopulatedCurrency) {
    const currency = user.currency;
    return {
      id: user._id,
      name: user.name || `${user.fname ?? ''} ${user.lname ?? ''}`.trim(),
      fname: user.fname,
      lname: user.lname,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      categoryLimit: user.categoryLimit ?? 10,
      defaultIncomeCategories: user.defaultIncomeCategories,
      defaultExpenseCategories: user.defaultExpenseCategories,
      currency: currency
        ? {
            id: currency._id,
            name: isPopulatedCurrency(currency) ? currency.name : undefined,
            code: isPopulatedCurrency(currency) ? currency.code : undefined,
            symbol: isPopulatedCurrency(currency) ? currency.symbol : undefined,
          }
        : null,
    };
  }

  private generateOtp(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }
}

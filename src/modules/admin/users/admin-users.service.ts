import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { UserDocument } from '../../users/schemas/user.schema';
import { AdminUsersRepository } from './admin-users.repository';
import { EmailService } from '../../email/email.service';
import type { AdminUserFilterDto } from './dto/admin-user-filter.dto';
import type { UpdateUserStatusDto } from './dto/update-user-status.dto';

type PopulatedCurrency = {
  code?: string;
  symbol?: string;
};

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly adminUsersRepository: AdminUsersRepository,
    private readonly emailService: EmailService,
  ) {}

  async listUsers(query: AdminUserFilterDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.$or = [
        { email: { $regex: query.search, $options: 'i' } },
        { fname: { $regex: query.search, $options: 'i' } },
        { lname: { $regex: query.search, $options: 'i' } },
        { name: { $regex: query.search, $options: 'i' } },
      ];
    }
    const [users, total] = await Promise.all([
      this.adminUsersRepository.list(filter, (page - 1) * pageSize, pageSize),
      this.adminUsersRepository.count(filter),
    ]);
    return { users: users.map((user) => this.toAdminUser(user)), total };
  }

  async getUserById(id: string) {
    const user = await this.adminUsersRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.toAdminUserProfile(user);
  }

  async updateUserById(id: string, dto: UpdateUserStatusDto) {
    const user = await this.adminUsersRepository.findByIdWithPassword(id);
    if (!user) throw new NotFoundException('User not found');
    if (dto.email !== undefined) user.email = dto.email.toLowerCase().trim();
    if (dto.fname !== undefined) user.fname = dto.fname;
    if (dto.lname !== undefined) user.lname = dto.lname;
    if (dto.status !== undefined) user.status = dto.status;
    if (dto.categoryLimit !== undefined) user.categoryLimit = dto.categoryLimit;
    await user.save();

    const updatedUser = await this.adminUsersRepository.findById(id);
    if (!updatedUser) throw new NotFoundException('User not found');
    return this.toAdminUserProfile(updatedUser);
  }

  async resetUserPassword(id: string) {
    const user = await this.adminUsersRepository.findByIdWithPassword(id);
    if (!user) throw new NotFoundException('User not found');
    const temporaryPassword = crypto.randomBytes(8).toString('base64url');
    user.password = await bcrypt.hash(temporaryPassword, Number(process.env.BCRYPT_ROUNDS ?? 10));
    user.mustChangePassword = true;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();
    await this.emailService.sendTemporaryPassword(user.email, temporaryPassword);
    return { userId: id, email: user.email };
  }

  async forceLogoutUser(id: string) {
    const user = await this.adminUsersRepository.findByIdWithPassword(id);
    if (!user) throw new NotFoundException('User not found');
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();
    return { userId: id, tokenVersion: user.tokenVersion };
  }

  async getUserActivity(id: string) {
    const user = await this.adminUsersRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    const activity = [
      {
        event: 'Account Created',
        details: 'User account was created',
        date: this.toIso(user.createdAt),
      },
    ];

    if (user.lastLoginAt) {
      activity.unshift({
        event: 'Login',
        details: 'Last successful login',
        date: this.toIso(user.lastLoginAt),
      });
    }

    return { activity };
  }

  private toAdminUser(user: UserDocument) {
    return {
      id: String(user._id),
      name: this.toDisplayName(user),
      email: user.email,
      status: user.status,
    };
  }

  private toAdminUserProfile(user: UserDocument) {
    return {
      id: String(user._id),
      name: this.toDisplayName(user),
      email: user.email,
      status: user.status,
      categoryLimit: user.categoryLimit ?? 10,
      defaultCurrency: this.toCurrencyLabel(user.currency as PopulatedCurrency | undefined),
      createdAt: this.toIso(user.createdAt),
      lastLoginAt: user.lastLoginAt ? this.toIso(user.lastLoginAt) : null,
      role: 'CONSUMER',
    };
  }

  private toDisplayName(user: UserDocument): string {
    const composed = `${user.fname ?? ''} ${user.lname ?? ''}`.trim();
    return user.name || composed || user.email;
  }

  private toCurrencyLabel(currency?: PopulatedCurrency): string {
    if (currency?.code && currency?.symbol) return `${currency.code} (${currency.symbol})`;
    if (currency?.code) return currency.code;
    return 'USD ($)';
  }

  private toIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }
}

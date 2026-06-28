import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminUsersRepository } from './admin-users.repository';
import { EmailService } from '../../email/email.service';
import type { AdminUserFilterDto } from './dto/admin-user-filter.dto';
import type { UpdateUserStatusDto } from './dto/update-user-status.dto';

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
      ];
    }
    const [users, total] = await Promise.all([
      this.adminUsersRepository.list(filter, (page - 1) * pageSize, pageSize),
      this.adminUsersRepository.count(filter),
    ]);
    return { users, total, page, pageSize };
  }

  async getUserById(id: string) {
    const user = await this.adminUsersRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return { user };
  }

  async updateUserById(id: string, dto: UpdateUserStatusDto) {
    const user = await this.adminUsersRepository.findByIdWithPassword(id);
    if (!user) throw new NotFoundException('User not found');
    if (dto.fname !== undefined) user.fname = dto.fname;
    if (dto.lname !== undefined) user.lname = dto.lname;
    if (dto.status !== undefined) user.status = dto.status;
    await user.save();
    return { user: await this.adminUsersRepository.findById(id) };
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
    return { userId: id, temporaryPasswordSent: true };
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
    return { userId: id, lastLoginAt: user.lastLoginAt, createdAt: user.createdAt, updatedAt: user.updatedAt };
  }
}

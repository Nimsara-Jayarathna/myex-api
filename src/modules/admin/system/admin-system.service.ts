import path from 'node:path';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AdminBackupJob, type AdminBackupJobDocument } from './schemas/admin-backup-job.schema';
import {
  AdminDeleteRequest,
  type AdminDeleteRequestDocument,
} from './schemas/admin-delete-request.schema';
import type { CreateDeleteRequestDto, DecideDeleteRequestDto } from './dto/admin-system.dto';

@Injectable()
export class AdminSystemService {
  constructor(
    @InjectModel(AdminBackupJob.name) private readonly backupModel: Model<AdminBackupJobDocument>,
    @InjectModel(AdminDeleteRequest.name)
    private readonly deleteRequestModel: Model<AdminDeleteRequestDocument>,
  ) {}

  async getSystemSnapshot() {
    return {
      nodeEnv: process.env.NODE_ENV ?? 'development',
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      generatedAt: new Date(),
    };
  }

  async getProviderUsageHistory(input: { date?: string }) {
    return { date: input.date ?? new Date().toISOString().slice(0, 10), usage: [] };
  }

  async startBackup(initiatedBy?: string | null, options?: { simulateFailure?: boolean }) {
    const job = await this.backupModel.create({
      initiatedBy: initiatedBy ?? null,
      shouldFail: Boolean(options?.simulateFailure),
      progress: 5,
      stage: 'Backup queued',
    });
    return { backup: job };
  }

  async getBackupById(id: string) {
    const backup = await this.backupModel.findById(id);
    if (!backup) throw new NotFoundException('Backup job not found');
    return { backup };
  }

  async getBackupDownloadFile(id: string) {
    const backup = await this.backupModel.findById(id);
    if (!backup) throw new NotFoundException('Backup job not found');
    return {
      path: backup.storagePath ?? path.join(process.cwd(), 'README.md'),
      fileName: backup.fileName ?? `blipzo-backup-${id}.json`,
    };
  }

  async cancelBackup(id: string) {
    const backup = await this.backupModel.findById(id);
    if (!backup) throw new NotFoundException('Backup job not found');
    backup.status = 'canceled';
    backup.completedAt = new Date();
    backup.stage = 'Backup canceled';
    await backup.save();
    return { backup };
  }

  async listDeleteRequests(query: { status?: string; page?: number; pageSize?: number }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    const [requests, total] = await Promise.all([
      this.deleteRequestModel
        .find(filter)
        .sort({ requestedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      this.deleteRequestModel.countDocuments(filter),
    ]);
    return { requests, total, page, pageSize };
  }

  async createDeleteRequest(dto: CreateDeleteRequestDto) {
    const request = await this.deleteRequestModel.create({
      userId: dto.userId ?? null,
      userName: dto.userName,
      userEmail: dto.userEmail,
      reason: dto.reason ?? 'User requested account deletion.',
    });
    return { request };
  }

  async decideDeleteRequest(id: string, dto: DecideDeleteRequestDto, reviewedBy?: string | null) {
    const request = await this.deleteRequestModel.findById(id);
    if (!request) throw new NotFoundException('Delete request not found');
    request.status = dto.decision;
    request.reviewedAt = new Date();
    request.reviewedBy = reviewedBy ?? null;
    request.reviewNote = dto.reviewNote ?? null;
    await request.save();
    return { request };
  }
}

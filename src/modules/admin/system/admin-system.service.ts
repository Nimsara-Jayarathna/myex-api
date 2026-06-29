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

type DeleteRequestStatus = 'pending' | 'approved' | 'denied';

@Injectable()
export class AdminSystemService {
  constructor(
    @InjectModel(AdminBackupJob.name) private readonly backupModel: Model<AdminBackupJobDocument>,
    @InjectModel(AdminDeleteRequest.name)
    private readonly deleteRequestModel: Model<AdminDeleteRequestDocument>,
  ) {}

  async getSystemSnapshot() {
    const [runningJob, lastJob, totalDeleteRequests, pendingDeleteRequests] = await Promise.all([
      this.backupModel.findOne({ status: 'running' }).sort({ startedAt: -1 }),
      this.backupModel.findOne({}).sort({ startedAt: -1 }),
      this.deleteRequestModel.countDocuments({}),
      this.deleteRequestModel.countDocuments({ status: 'pending' }),
    ]);

    return {
      providerHealth: {
        status: 'ok',
        sendRatePerDay: Number(process.env.EMAIL_DAILY_LIMIT ?? 300),
        sentToday: 0,
        failedToday: 0,
        usagePct: 0,
        successRate: 100,
      },
      dbHealth: {
        connected: true,
        totalSizeGb: 0,
        dataSizeMb: 0,
        indexSizeMb: 0,
        capacityGb: Number(process.env.ADMIN_DB_CAPACITY_GB ?? 1),
        usedPct: 0,
        remainingGb: Number(process.env.ADMIN_DB_CAPACITY_GB ?? 1),
      },
      backup: {
        lastBackupAt: lastJob?.startedAt ? this.toIso(lastJob.startedAt) : null,
        lastBackupStatus: lastJob?.status ?? 'never',
        target: lastJob?.target ?? 'remote_cloud_storage_node_01',
        runningJob: runningJob ? this.toBackupJob(runningJob) : null,
        lastJobId: lastJob ? String(lastJob._id) : null,
      },
      deleteRequests: {
        total: totalDeleteRequests,
        pending: pendingDeleteRequests,
      },
    };
  }

  async getProviderUsageHistory(input: { date?: string }) {
    const selectedDate = input.date ?? new Date().toISOString().slice(0, 10);
    const limit = Number(process.env.EMAIL_DAILY_LIMIT ?? 300);

    return {
      selectedDate,
      summary: {
        sent: 0,
        limit,
        usagePct: 0,
        successRate: 100,
        failed: 0,
      },
      history: [
        {
          date: selectedDate,
          sent: 0,
          failed: 0,
          limit,
          usagePct: 0,
          successRate: 100,
        },
      ],
      hourlyDistribution: Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 })),
      failedEvents: [],
    };
  }

  async startBackup(initiatedBy?: string | null, options?: { simulateFailure?: boolean }) {
    const job = await this.backupModel.create({
      initiatedBy: initiatedBy ?? null,
      shouldFail: Boolean(options?.simulateFailure),
      progress: 5,
      stage: 'Backup queued',
    });
    return this.toBackupJob(job);
  }

  async getBackupById(id: string) {
    const backup = await this.backupModel.findById(id);
    if (!backup) throw new NotFoundException('Backup job not found');
    return this.toBackupJob(backup);
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
    return this.toBackupJob(backup);
  }

  async listDeleteRequests(query: { status?: string; page?: number; pageSize?: number }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    const [requests, total, pending, approved, denied] = await Promise.all([
      this.deleteRequestModel
        .find(filter)
        .sort({ requestedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      this.deleteRequestModel.countDocuments(filter),
      this.deleteRequestModel.countDocuments({ status: 'pending' }),
      this.deleteRequestModel.countDocuments({ status: 'approved' }),
      this.deleteRequestModel.countDocuments({ status: 'denied' }),
    ]);
    return {
      requests: requests.map((request) => this.toDeleteRequest(request)),
      summary: {
        pending,
        approved,
        denied,
        total,
      },
    };
  }

  async createDeleteRequest(dto: CreateDeleteRequestDto) {
    const request = await this.deleteRequestModel.create({
      userId: dto.userId ?? null,
      userName: dto.userName,
      userEmail: dto.userEmail,
      reason: dto.reason ?? 'User requested account deletion.',
    });
    return this.toDeleteRequest(request);
  }

  async decideDeleteRequest(id: string, dto: DecideDeleteRequestDto, reviewedBy?: string | null) {
    const request = await this.deleteRequestModel.findById(id);
    if (!request) throw new NotFoundException('Delete request not found');
    request.status = this.toDeleteRequestDecision(dto.decision);
    request.reviewedAt = new Date();
    request.reviewedBy = reviewedBy ?? null;
    request.reviewNote = dto.reviewNote ?? dto.note ?? null;
    await request.save();
    return this.toDeleteRequest(request);
  }

  private toBackupJob(job: AdminBackupJobDocument) {
    return {
      id: String(job._id),
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      target: job.target,
      startedAt: job.startedAt ? this.toIso(job.startedAt) : null,
      completedAt: job.completedAt ? this.toIso(job.completedAt) : null,
      fileName: job.fileName ?? null,
      hasDownload: Boolean(job.fileName || job.storagePath),
      fileSizeBytes: job.fileSizeBytes ?? null,
      errorCode: job.errorCode ?? null,
      errorMessage: job.errorMessage ?? null,
    };
  }

  private toDeleteRequest(request: AdminDeleteRequestDocument) {
    return {
      id: String(request._id),
      userId: request.userId ? String(request.userId) : null,
      userName: request.userName,
      userEmail: request.userEmail,
      status: request.status,
      reason: request.reason,
      requestedAt: request.requestedAt ? this.toIso(request.requestedAt) : null,
      reviewedAt: request.reviewedAt ? this.toIso(request.reviewedAt) : null,
      reviewedBy: request.reviewedBy ?? null,
      reviewNote: request.reviewNote ?? null,
    };
  }

  private toDeleteRequestDecision(
    decision: DecideDeleteRequestDto['decision'],
  ): DeleteRequestStatus {
    if (decision === 'approve') return 'approved';
    if (decision === 'deny') return 'denied';
    return decision;
  }

  private toIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
  }
}

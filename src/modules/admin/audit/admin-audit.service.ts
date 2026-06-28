import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AdminAuditLog, type AdminAuditLogDocument } from './schemas/admin-audit-log.schema';

export interface AdminAuditRecord {
  adminEmail?: string | null;
  method: string;
  path: string;
  status: 'success' | 'failed';
  durationMs: number;
  errorMessage?: string;
}

@Injectable()
export class AdminAuditService {
  constructor(
    @InjectModel(AdminAuditLog.name) private readonly auditModel: Model<AdminAuditLogDocument>,
  ) {}

  async record(payload: AdminAuditRecord): Promise<void> {
    await this.auditModel.create(payload);
  }

  async list(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [logs, total] = await Promise.all([
      this.auditModel.find({}).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
      this.auditModel.countDocuments({}),
    ]);
    return { logs, total, page, pageSize };
  }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { User, type UserDocument } from '../../users/schemas/user.schema';
import {
  Transaction,
  type TransactionDocument,
} from '../../transactions/schemas/transaction.schema';
import { Currency, type CurrencyDocument } from '../../currencies/schemas/currency.schema';
import { AdminAuditLog, type AdminAuditLogDocument } from '../audit/schemas/admin-audit-log.schema';

type DashboardPeriod = '30d' | '90d';
type DashboardEventLevel = 'ERROR' | 'WARN' | 'INFO' | 'UPDATE';

interface DashboardQuery {
  period?: DashboardPeriod;
  eventsLimit?: number;
}

interface CurrencyUsageAggregateRow {
  _id?: string | null;
  amount?: number;
}

interface DashboardCurrencySegment {
  code: string;
  amount: number;
  percent: number;
}

interface DashboardEvent {
  level: DashboardEventLevel;
  message: string;
  occurredAt: string;
}

interface AuditLogLean {
  method?: string;
  path?: string;
  status?: 'success' | 'failed';
  errorMessage?: string | null;
  createdAt?: Date;
}

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(Currency.name) private readonly currencyModel: Model<CurrencyDocument>,
    @InjectModel(AdminAuditLog.name)
    private readonly auditModel: Model<AdminAuditLogDocument>,
  ) {}

  async getDashboard(query: DashboardQuery = {}) {
    const period = query.period ?? '30d';
    const eventsLimit = this.normalizeEventsLimit(query.eventsLimit);
    const since = this.getPeriodStartDate(period);

    const [totalUsers, activeUsers, defaultCurrency, currencyRows, recentEvents, errorCount] =
      await Promise.all([
        this.userModel.countDocuments({}),
        this.userModel.countDocuments({ status: 'ACTIVE' }),
        this.currencyModel.findOne({ isDefault: true }).lean(),
        this.getCurrencyUsageRows(since),
        this.getRecentEvents(eventsLimit),
        this.auditModel.countDocuments({ status: 'failed', createdAt: { $gte: since } }),
      ]);

    const currencyUsage = this.toCurrencyUsage(
      period,
      currencyRows,
      defaultCurrency?.code ?? 'USD',
    );

    return {
      summary: {
        totalUsers: { value: totalUsers, deltaPct: 0 },
        activeUsers: { value: activeUsers, deltaPct: 0 },
        defaultCurrency: { value: defaultCurrency?.code ?? 'USD', deltaPct: 0 },
        errorCount: { value: errorCount, deltaPct: 0 },
      },
      currencyUsage,
      recentEvents,
    };
  }

  private async getCurrencyUsageRows(since: Date): Promise<CurrencyUsageAggregateRow[]> {
    return this.transactionModel.aggregate<CurrencyUsageAggregateRow>([
      {
        $match: {
          status: 'active',
          date: { $gte: since },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDoc',
        },
      },
      { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'currencies',
          localField: 'userDoc.currency',
          foreignField: '_id',
          as: 'currencyDoc',
        },
      },
      { $unwind: { path: '$currencyDoc', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$currencyDoc.code', 'UNKNOWN'] },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { amount: -1 } },
    ]);
  }

  private async getRecentEvents(limit: number): Promise<DashboardEvent[]> {
    const logs = await this.auditModel
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<AuditLogLean[]>();

    return logs.map((log) => ({
      level: log.status === 'failed' ? 'ERROR' : 'INFO',
      message: this.toEventMessage(log),
      occurredAt: this.toRelativeTime(log.createdAt ?? new Date()),
    }));
  }

  private toCurrencyUsage(
    period: DashboardPeriod,
    rows: CurrencyUsageAggregateRow[],
    fallbackCurrencyCode: string,
  ) {
    const normalizedRows = rows.length > 0 ? rows : [{ _id: fallbackCurrencyCode, amount: 0 }];
    const totalAmount = this.roundAmount(
      normalizedRows.reduce((total, row) => total + Number(row.amount ?? 0), 0),
    );

    const segments: DashboardCurrencySegment[] = normalizedRows.map((row) => {
      const amount = this.roundAmount(Number(row.amount ?? 0));
      return {
        code: row._id && row._id !== 'UNKNOWN' ? row._id : fallbackCurrencyCode,
        amount,
        percent: totalAmount > 0 ? this.roundPercent((amount / totalAmount) * 100) : 0,
      };
    });

    return {
      period,
      totalAmount,
      segments,
    };
  }

  private toEventMessage(log: AuditLogLean): string {
    if (log.errorMessage) return log.errorMessage;
    const method = log.method ?? 'REQUEST';
    const path = log.path ?? '/internal/admin';
    return `${method} ${path}`;
  }

  private toRelativeTime(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

    if (diffSeconds < 60) return `${diffSeconds}s ago`;

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  private getPeriodStartDate(period: DashboardPeriod): Date {
    const days = period === '90d' ? 90 : 30;
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  private normalizeEventsLimit(value?: number): number {
    const numericValue = Number(value ?? 6);
    if (!Number.isFinite(numericValue)) return 6;
    return Math.min(Math.max(Math.floor(numericValue), 0), 50);
  }

  private roundAmount(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private roundPercent(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import mongoose, { type FilterQuery, type Types } from 'mongoose';
import type { UserDocument } from '../users/schemas/user.schema';
import { Category, type CategoryDocument } from '../categories/schemas/category.schema';
import { CategoriesRepository } from '../categories/categories.repository';
import { TransactionsRepository } from './transactions.repository';
import type { CreateTransactionDto } from './dto/create-transaction.dto';
import type { TransactionFilterDto } from './dto/transaction-filter.dto';
import type { UpdateTransactionDto } from './dto/update-transaction.dto';
import type { TransactionDocument } from './schemas/transaction.schema';

const ALLOWED_TYPES = ['income', 'expense'] as const;
const ALLOWED_STATUS = ['active', 'undone'] as const;

const normalizeCategoryName = (name?: string): string => (name ?? '').trim();
const normalizeToUtcMidnight = (value: string | Date): Date => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new BadRequestException('date is invalid');
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly categoriesRepository: CategoriesRepository,
  ) {}

  async createTransaction(user: UserDocument, body: CreateTransactionDto, requireDate = false) {
    const numericAmount = Number(body.amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new BadRequestException('amount must be a positive number');
    }
    if (requireDate && !body.date) throw new BadRequestException('date is required for custom transactions');

    const categoryDoc = await this.resolveCategoryForCreation({
      user,
      type: body.type,
      category: body.category,
      categoryId: body.categoryId,
    });

    const customDate = body.date ? normalizeToUtcMidnight(body.date) : undefined;
    const finalDescription = body.description ?? body.note ?? undefined;
    const transaction = await this.transactionsRepository.create({
      user: user._id,
      title: body.title?.trim() || categoryDoc.name || body.type,
      description: finalDescription,
      type: body.type,
      category: categoryDoc.name,
      categoryId: categoryDoc._id,
      amount: numericAmount,
      ...(customDate ? { date: customDate } : {}),
      status: body.status ?? 'active',
      isCustomDate: Boolean(customDate),
    });
    return { transaction: this.buildTransactionResponse(transaction) };
  }

  async getTransactions(user: UserDocument, queryParams: TransactionFilterDto) {
    const filter: FilterQuery<TransactionDocument> = { user: user._id };
    if (queryParams.status) filter.status = queryParams.status;
    if (queryParams.type) filter.type = queryParams.type;
    if (queryParams.category) filter.category = { $regex: queryParams.category.trim(), $options: 'i' };
    if (queryParams.startDate || queryParams.endDate) {
      filter.date = {};
      if (queryParams.startDate) filter.date.$gte = normalizeToUtcMidnight(queryParams.startDate);
      if (queryParams.endDate) {
        const end = normalizeToUtcMidnight(queryParams.endDate);
        end.setUTCHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const sortField = queryParams.sortBy ?? 'date';
    const sortDir = queryParams.sortDir === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortDir, createdAt: -1 as const };
    const usePagination = Boolean(queryParams.page && queryParams.pageSize);
    const page = queryParams.page ?? 1;
    const pageSize = queryParams.pageSize ?? 20;
    const total = usePagination ? await this.transactionsRepository.count(filter) : 0;
    const transactions = await this.transactionsRepository.find(
      filter,
      sort,
      usePagination ? (page - 1) * pageSize : undefined,
      usePagination ? pageSize : undefined,
    );
    const mapped = transactions.map((transaction) => this.buildTransactionResponse(transaction));
    return usePagination ? { transactions: mapped, total, page, pageSize } : { transactions: mapped };
  }

  async getSummary(user: UserDocument) {
    const [result] = await this.transactionsRepository.aggregate<{
      totals: Array<{ _id: 'income' | 'expense'; total: number }>;
      monthly: Array<{ _id: string; income: number; expense: number }>;
    }>([
      { $match: { user: new mongoose.Types.ObjectId(String(user._id)), status: 'active' } },
      {
        $facet: {
          totals: [{ $group: { _id: '$type', total: { $sum: '$amount' } } }],
          monthly: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
                income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
                expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
              },
            },
            { $sort: { _id: -1 } },
            { $limit: 12 },
          ],
        },
      },
    ]);
    const income = result?.totals.find((item) => item._id === 'income')?.total ?? 0;
    const expense = result?.totals.find((item) => item._id === 'expense')?.total ?? 0;
    return { income, expense, balance: income - expense, monthly: result?.monthly ?? [] };
  }

  async updateTransaction(user: UserDocument, id: string, body: UpdateTransactionDto) {
    const transaction = await this.transactionsRepository.findOne({ _id: id, user: user._id });
    if (!transaction) throw new NotFoundException('Transaction not found');

    if (body.type) transaction.type = body.type;
    if (body.amount !== undefined) transaction.amount = Number(body.amount);
    if (body.status) transaction.status = body.status;
    if (body.title !== undefined) transaction.title = body.title;
    if (body.description !== undefined || body.note !== undefined) {
      transaction.description = body.description ?? body.note;
    }
    if (body.date) {
      transaction.date = normalizeToUtcMidnight(body.date);
      transaction.isCustomDate = true;
    }
    if (body.category || body.categoryId) {
      const category = await this.resolveCategoryForCreation({
        user,
        type: body.type ?? transaction.type,
        category: body.category,
        categoryId: body.categoryId,
      });
      transaction.category = category.name;
      transaction.categoryId = category._id;
    }
    await transaction.save();
    return { transaction: this.buildTransactionResponse(transaction) };
  }

  async deleteTransaction(user: UserDocument, id: string) {
    const transaction = await this.transactionsRepository.findOne({ _id: id, user: user._id });
    if (!transaction) throw new NotFoundException('Transaction not found');
    await transaction.deleteOne();
    return { id };
  }

  private async resolveCategoryForCreation(input: {
    user: UserDocument;
    type: 'income' | 'expense';
    category?: string;
    categoryId?: string;
  }): Promise<CategoryDocument> {
    if (!ALLOWED_TYPES.includes(input.type)) {
      throw new BadRequestException('type must be either income or expense');
    }
    const lookup = this.deriveCategoryLookup(input);
    const defaultCategoryName =
      input.type === 'income'
        ? normalizeCategoryName(input.user.defaultIncomeCategories?.[0])
        : normalizeCategoryName(input.user.defaultExpenseCategories?.[0]);
    const fallbackCategoryName = lookup.categoryId ? undefined : lookup.categoryName || defaultCategoryName;
    if (!lookup.categoryId && !fallbackCategoryName) throw new BadRequestException('category is required');

    const category = await this.resolveCategory({
      userId: input.user._id,
      type: input.type,
      categoryName: fallbackCategoryName,
      categoryId: lookup.categoryId,
    });
    return category;
  }

  private deriveCategoryLookup(input: { category?: string; categoryId?: string }) {
    const normalizedCategoryId = typeof input.categoryId === 'string' ? input.categoryId.trim() : input.categoryId;
    if (normalizedCategoryId) return { categoryId: normalizedCategoryId, categoryName: undefined };
    const normalizedCategory = normalizeCategoryName(input.category);
    if (normalizedCategory && mongoose.Types.ObjectId.isValid(normalizedCategory)) {
      return { categoryId: normalizedCategory, categoryName: undefined };
    }
    return { categoryId: undefined, categoryName: normalizedCategory || undefined };
  }

  private async resolveCategory(input: {
    userId: Types.ObjectId;
    type: 'income' | 'expense';
    categoryName?: string;
    categoryId?: string;
  }) {
    let category: CategoryDocument | null = null;
    if (input.categoryId) {
      if (!mongoose.Types.ObjectId.isValid(input.categoryId)) throw new BadRequestException('categoryId is invalid');
      category = await this.categoriesRepository.findOne({
        _id: input.categoryId,
        type: input.type,
        $or: [{ user: input.userId }, { user: null }],
      });
    } else if (input.categoryName) {
      category = await this.categoriesRepository.findOne({
        type: input.type,
        name: input.categoryName,
        $or: [{ user: input.userId }, { user: null }],
      });
    }
    if (!category) throw new NotFoundException('Category not found. Create it before assigning to a transaction.');
    if (!category.isActive) throw new BadRequestException('Category is inactive');
    return category;
  }

  private buildTransactionResponse(transaction: { [key: string]: any }) {
    return {
      id: transaction._id,
      _id: transaction._id,
      user: transaction.user,
      title: transaction.title,
      description: transaction.description,
      note: transaction.description,
      type: transaction.type,
      category: transaction.category,
      categoryName: transaction.category,
      categoryId: transaction.categoryId,
      amount: transaction.amount,
      date: transaction.date,
      status: transaction.status,
      isCustomDate: transaction.isCustomDate,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}

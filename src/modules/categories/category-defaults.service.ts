import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import { Category, type CategoryDocument } from './schemas/category.schema';
import { AdminCategoryPolicy, type AdminCategoryPolicyDocument } from '../admin/categories/schemas/admin-category-policy.schema';

export interface CategoryRegistrationDefaults {
  incomeName: string;
  expenseName: string;
  categoryLimit: number;
}

@Injectable()
export class CategoryDefaultsService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(AdminCategoryPolicy.name)
    private readonly policyModel: Model<AdminCategoryPolicyDocument>,
  ) {}

  async getRegistrationDefaults(): Promise<CategoryRegistrationDefaults> {
    const policy = await this.policyModel.findOne({ scope: 'global' }).lean();
    return {
      incomeName: policy?.defaultIncomeCategoryName ?? 'Sales',
      expenseName: policy?.defaultExpenseCategoryName ?? 'Stock',
      categoryLimit: policy?.defaultCategoryLimit ?? 10,
    };
  }

  async ensureUserDefaultCategories(
    userId: Types.ObjectId,
    incomeName: string,
    expenseName: string,
  ): Promise<void> {
    await this.ensure(userId, incomeName, 'income');
    await this.ensure(userId, expenseName, 'expense');
  }

  private async ensure(userId: Types.ObjectId, name: string, type: 'income' | 'expense') {
    const normalized = name.trim();
    const existing = await this.categoryModel.findOne({ user: userId, type, name: normalized });
    if (existing) return;
    await this.categoryModel.create({ user: userId, name: normalized, type, isDefault: true });
  }
}

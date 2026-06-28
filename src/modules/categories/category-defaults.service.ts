import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import { Category, type CategoryDocument } from './schemas/category.schema';
import {
  AdminCategoryPolicy,
  type AdminCategoryPolicyDocument,
} from '../admin/categories/schemas/admin-category-policy.schema';

export interface CategoryRegistrationDefaults {
  incomeName: string;
  expenseName: string;
  categoryLimit: number;
}

type CategoryType = 'income' | 'expense';

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
    await this.ensureMissingUserDefault(userId, incomeName, 'income');
    await this.ensureMissingUserDefault(userId, expenseName, 'expense');
  }

  private async ensureMissingUserDefault(
    userId: Types.ObjectId,
    name: string,
    type: CategoryType,
  ): Promise<void> {
    const activeDefault = await this.categoryModel.findOne({
      user: userId,
      type,
      isActive: true,
      isDefault: true,
    });

    if (activeDefault) return;

    const normalized = name.trim();
    const existing = await this.categoryModel.findOne({ user: userId, type, name: normalized });

    await this.categoryModel.updateMany(
      { user: userId, type, isDefault: true },
      { isDefault: false },
    );

    if (existing) {
      existing.isActive = true;
      existing.isDefault = true;
      await existing.save();
      return;
    }

    await this.categoryModel.create({
      user: userId,
      name: normalized,
      type,
      isDefault: true,
      isActive: true,
    });
  }
}

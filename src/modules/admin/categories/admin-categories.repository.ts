import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model } from 'mongoose';
import { Category, type CategoryDocument } from '../../categories/schemas/category.schema';
import {
  AdminCategoryPolicy,
  type AdminCategoryPolicyDocument,
} from './schemas/admin-category-policy.schema';

@Injectable()
export class AdminCategoriesRepository {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(AdminCategoryPolicy.name)
    private readonly policyModel: Model<AdminCategoryPolicyDocument>,
  ) {}

  find(filter: FilterQuery<CategoryDocument>) {
    return this.categoryModel.find(filter).sort({ type: 1, isDefault: -1, name: 1 });
  }

  findById(id: string) {
    return this.categoryModel.findById(id);
  }

  findOne(filter: FilterQuery<CategoryDocument>) {
    return this.categoryModel.findOne(filter);
  }

  create(payload: Partial<Category>) {
    return this.categoryModel.create(payload);
  }

  updateMany(filter: FilterQuery<CategoryDocument>, payload: Partial<Category>) {
    return this.categoryModel.updateMany(filter, payload);
  }

  getPolicy() {
    return this.policyModel.findOneAndUpdate(
      { scope: 'global' },
      { $setOnInsert: { scope: 'global' } },
      { upsert: true, new: true },
    );
  }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { FilterQuery, Model, Types } from 'mongoose';
import { Category, type CategoryDocument } from './schemas/category.schema';

@Injectable()
export class CategoriesRepository {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  find(filter: FilterQuery<CategoryDocument>) {
    return this.categoryModel.find(filter).sort({ type: 1, isDefault: -1, name: 1 });
  }

  findById(id: string | Types.ObjectId) {
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
}

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Types } from 'mongoose';
import { CategoriesRepository } from './categories.repository';
import type { UserDocument } from '../users/schemas/user.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const ALLOWED_TYPES = ['income', 'expense'] as const;

type CategoryType = (typeof ALLOWED_TYPES)[number];

const normalizeName = (name = '') => name.trim();

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  buildCategoryResponse(category: { [key: string]: any }) {
    return {
      id: category._id,
      name: category.name,
      type: category.type,
      isDefault: category.isDefault,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      isGlobal: !category.user,
    };
  }

  async listActiveCategories(user: UserDocument, type?: CategoryType) {
    this.assertType(type);
    const filter: Record<string, unknown> = {
      isActive: true,
      $or: [{ user: user._id }, { user: null }],
    };
    if (type) filter.type = type;
    const categories = await this.categoriesRepository.find(filter);
    return { categories: categories.map((category) => this.buildCategoryResponse(category)) };
  }

  async listAllCategories(user: UserDocument, type?: CategoryType) {
    this.assertType(type);
    const filter: Record<string, unknown> = { $or: [{ user: user._id }, { user: null }] };
    if (type) filter.type = type;
    const categories = await this.categoriesRepository.find(filter);
    return { categories: categories.map((category) => this.buildCategoryResponse(category)) };
  }

  async createCategory(user: UserDocument, dto: CreateCategoryDto) {
    this.assertType(dto.type);
    const name = normalizeName(dto.name);
    if (!name) throw new BadRequestException('name is required');

    const existing = await this.categoriesRepository.findOne({ user: user._id, type: dto.type, name });
    if (existing?.isActive) throw new ConflictException('Category already exists');
    if (existing && !existing.isActive) {
      existing.isActive = true;
      if (dto.isDefault) existing.isDefault = true;
      await existing.save();
      return { category: this.buildCategoryResponse(existing), reactivated: true };
    }

    if (dto.isDefault) {
      await this.categoriesRepository.updateMany(
        { user: user._id, type: dto.type, isDefault: true },
        { isDefault: false },
      );
    }
    const category = await this.categoriesRepository.create({
      user: user._id,
      type: dto.type,
      name,
      isDefault: Boolean(dto.isDefault),
      isActive: true,
    });
    return { category: this.buildCategoryResponse(category), reactivated: false };
  }

  async setDefaultCategory(user: UserDocument, id: string, _body?: UpdateCategoryDto) {
    const category = await this.categoriesRepository.findById(id);
    if (!category || String(category.user) !== String(user._id)) {
      throw new NotFoundException('Category not found');
    }
    if (!category.isActive) throw new BadRequestException('Category is inactive');

    await this.categoriesRepository.updateMany(
      { user: user._id, type: category.type, isDefault: true },
      { isDefault: false },
    );
    category.isDefault = true;
    await category.save();
    return { category: this.buildCategoryResponse(category) };
  }

  async archiveCategory(user: UserDocument, id: string) {
    const category = await this.categoriesRepository.findById(id);
    if (!category || String(category.user) !== String(user._id)) {
      throw new NotFoundException('Category not found');
    }
    category.isActive = false;
    category.isDefault = false;
    await category.save();
    return { category: this.buildCategoryResponse(category) };
  }

  private assertType(type?: string): asserts type is CategoryType | undefined {
    if (type && !ALLOWED_TYPES.includes(type as CategoryType)) {
      throw new BadRequestException('type must be either income or expense');
    }
  }
}

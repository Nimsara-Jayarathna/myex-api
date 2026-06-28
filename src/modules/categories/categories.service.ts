import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Types } from 'mongoose';
import { CategoriesRepository } from './categories.repository';
import type { CategoryDocument } from './schemas/category.schema';
import type { UserDocument } from '../users/schemas/user.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const ALLOWED_TYPES = ['income', 'expense'] as const;

type CategoryType = (typeof ALLOWED_TYPES)[number];

type CategoryResponse = {
  id: string;
  name: string;
  type: CategoryType;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  isGlobal: boolean;
};

const normalizeName = (name = '') => name.trim();
const normalizeKeyName = (name = '') => normalizeName(name).toLowerCase();

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  buildCategoryResponse(
    category: CategoryDocument,
    override?: { isDefault?: boolean },
  ): CategoryResponse {
    return {
      id: String(category._id),
      name: category.name,
      type: category.type,
      isDefault: override?.isDefault ?? category.isDefault,
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
    return { categories: this.buildEffectiveCategoryResponses(categories) };
  }

  async listAllCategories(user: UserDocument, type?: CategoryType) {
    this.assertType(type);
    const filter: Record<string, unknown> = { $or: [{ user: user._id }, { user: null }] };
    if (type) filter.type = type;
    const categories = await this.categoriesRepository.find(filter);
    return { categories: this.buildEffectiveCategoryResponses(categories) };
  }

  async createCategory(user: UserDocument, dto: CreateCategoryDto) {
    this.assertType(dto.type);
    const name = normalizeName(dto.name);
    if (!name) throw new BadRequestException('name is required');

    const existing = await this.categoriesRepository.findOne({
      user: user._id,
      type: dto.type,
      name,
    });
    if (existing?.isActive) throw new ConflictException('Category already exists');
    if (existing && !existing.isActive) {
      existing.isActive = true;
      if (dto.isDefault) {
        await this.clearUserDefaults(user._id, dto.type);
        existing.isDefault = true;
      }
      await existing.save();
      return { category: this.buildCategoryResponse(existing), reactivated: true };
    }

    if (dto.isDefault) await this.clearUserDefaults(user._id, dto.type);

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

    await this.clearUserDefaults(user._id, category.type);
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

  private async clearUserDefaults(userId: Types.ObjectId, type: CategoryType): Promise<void> {
    await this.categoriesRepository.updateMany(
      { user: userId, type, isDefault: true },
      { isDefault: false },
    );
  }

  private buildEffectiveCategoryResponses(categories: CategoryDocument[]): CategoryResponse[] {
    const visibleCategories = this.dedupeCategoriesForUserList(categories);
    const defaultIdsByType = this.resolveEffectiveDefaultIds(categories, visibleCategories);

    return visibleCategories
      .map((category) =>
        this.buildCategoryResponse(category, {
          isDefault: defaultIdsByType.get(category.type) === String(category._id),
        }),
      )
      .sort((left, right) => {
        if (left.type !== right.type) return left.type.localeCompare(right.type);
        if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
        return left.name.localeCompare(right.name);
      });
  }

  private dedupeCategoriesForUserList(categories: CategoryDocument[]): CategoryDocument[] {
    const byTypeAndName = new Map<string, CategoryDocument>();

    for (const category of categories) {
      const key = this.categoryDedupeKey(category);
      const existing = byTypeAndName.get(key);
      if (!existing) {
        byTypeAndName.set(key, category);
        continue;
      }

      const currentIsUserCategory = this.isUserCategory(category);
      const existingIsUserCategory = this.isUserCategory(existing);

      if (currentIsUserCategory && !existingIsUserCategory) {
        byTypeAndName.set(key, category);
        continue;
      }

      if (
        currentIsUserCategory === existingIsUserCategory &&
        category.isDefault &&
        !existing.isDefault
      ) {
        byTypeAndName.set(key, category);
      }
    }

    return [...byTypeAndName.values()];
  }

  private resolveEffectiveDefaultIds(
    sourceCategories: CategoryDocument[],
    visibleCategories: CategoryDocument[],
  ): Map<CategoryType, string> {
    const defaultIdsByType = new Map<CategoryType, string>();

    for (const type of ALLOWED_TYPES) {
      const userDefault = sourceCategories.find(
        (category) =>
          category.type === type &&
          category.isActive &&
          category.isDefault &&
          this.isUserCategory(category),
      );

      const defaultCandidate =
        userDefault ??
        sourceCategories.find(
          (category) =>
            category.type === type &&
            category.isActive &&
            category.isDefault &&
            !this.isUserCategory(category),
        );

      if (!defaultCandidate) continue;

      const visibleDefault =
        visibleCategories.find(
          (category) =>
            this.categoryDedupeKey(category) === this.categoryDedupeKey(defaultCandidate),
        ) ?? defaultCandidate;

      defaultIdsByType.set(type, String(visibleDefault._id));
    }

    return defaultIdsByType;
  }

  private categoryDedupeKey(category: CategoryDocument): string {
    return `${category.type}:${normalizeKeyName(category.name)}`;
  }

  private isUserCategory(category: CategoryDocument): boolean {
    return Boolean(category.user);
  }

  private assertType(type?: string): asserts type is CategoryType | undefined {
    if (type && !ALLOWED_TYPES.includes(type as CategoryType)) {
      throw new BadRequestException('type must be either income or expense');
    }
  }
}

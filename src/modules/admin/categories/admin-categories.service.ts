import { Injectable, NotFoundException } from '@nestjs/common';
import type { CategoryDocument } from '../../categories/schemas/category.schema';
import { AdminCategoriesRepository } from './admin-categories.repository';
import type { AdminCategoryDto, UpdateAdminCategoryDto } from './dto/admin-category.dto';

type CategoryType = 'income' | 'expense';

@Injectable()
export class AdminCategoriesService {
  constructor(private readonly repository: AdminCategoriesRepository) {}

  async listCategories(query: { type?: CategoryType; isActive?: boolean }) {
    const filter: Record<string, unknown> = { user: null };
    if (query.type) filter.type = query.type;
    if (typeof query.isActive === 'boolean') filter.isActive = query.isActive;
    const categories = await this.repository.find(filter);
    const settings = await this.repository.getPolicy();
    return { categories, settings };
  }

  async createCategory(dto: AdminCategoryDto, updatedBy?: string | null) {
    if (dto.isDefault) await this.clearGlobalDefaults(dto.type);

    const category = await this.repository.create({
      user: null,
      name: dto.name.trim(),
      type: dto.type,
      isDefault: Boolean(dto.isDefault),
      isActive: true,
    });

    if (category.isDefault) await this.syncPolicyDefault(category, updatedBy);
    else await this.ensureSettings(updatedBy);

    return { category };
  }

  async updateCategory(id: string, dto: UpdateAdminCategoryDto, updatedBy?: string | null) {
    const category = await this.repository.findById(id);
    if (!category) throw new NotFoundException('Category not found');

    const wasDefault = category.isDefault;

    if (dto.name !== undefined) category.name = dto.name.trim();
    if (dto.isActive !== undefined) {
      category.isActive = dto.isActive;
      if (!dto.isActive) category.isDefault = false;
    }

    await category.save();

    if (category.isDefault) await this.syncPolicyDefault(category, updatedBy);
    else if (wasDefault && !category.isDefault) await this.ensureReplacementDefault(category.type, updatedBy);
    else await this.ensureSettings(updatedBy);

    return { category };
  }

  async setDefaultCategory(id: string, updatedBy?: string | null) {
    const category = await this.repository.findById(id);
    if (!category) throw new NotFoundException('Category not found');

    await this.clearGlobalDefaults(category.type);
    category.isDefault = true;
    category.isActive = true;
    await category.save();
    await this.syncPolicyDefault(category, updatedBy);

    return { category };
  }

  async deleteCategory(id: string, updatedBy?: string | null) {
    const category = await this.repository.findById(id);
    if (!category) throw new NotFoundException('Category not found');

    const wasDefault = category.isDefault;
    category.isActive = false;
    category.isDefault = false;
    await category.save();

    if (wasDefault) await this.ensureReplacementDefault(category.type, updatedBy);

    return { category };
  }

  async updateCategoryLimit(defaultCategoryLimit: number, updatedBy?: string | null) {
    const settings = await this.repository.getPolicy();
    settings.defaultCategoryLimit = defaultCategoryLimit;
    settings.updatedBy = updatedBy ?? null;
    await settings.save();
    return { settings };
  }

  private async clearGlobalDefaults(type: CategoryType): Promise<void> {
    await this.repository.updateMany({ user: null, type, isDefault: true }, { isDefault: false });
  }

  private async syncPolicyDefault(category: CategoryDocument, updatedBy?: string | null): Promise<void> {
    const settings = await this.repository.getPolicy();

    if (category.type === 'income') settings.defaultIncomeCategoryName = category.name;
    else settings.defaultExpenseCategoryName = category.name;

    settings.updatedBy = updatedBy ?? settings.updatedBy ?? null;
    await settings.save();
  }

  private async ensureReplacementDefault(type: CategoryType, updatedBy?: string | null): Promise<void> {
    const existingDefault = await this.repository.findOne({
      user: null,
      type,
      isActive: true,
      isDefault: true,
    });

    if (existingDefault) {
      await this.syncPolicyDefault(existingDefault, updatedBy);
      return;
    }

    const replacement = await this.repository.findOne({ user: null, type, isActive: true });
    if (!replacement) {
      await this.ensureSettings(updatedBy);
      return;
    }

    await this.clearGlobalDefaults(type);
    replacement.isDefault = true;
    await replacement.save();
    await this.syncPolicyDefault(replacement, updatedBy);
  }

  private async ensureSettings(updatedBy?: string | null) {
    const settings = await this.repository.getPolicy();
    settings.updatedBy = updatedBy ?? settings.updatedBy;
    await settings.save();
    return settings;
  }
}

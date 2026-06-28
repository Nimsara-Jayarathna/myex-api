import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminCategoriesRepository } from './admin-categories.repository';
import type { AdminCategoryDto, UpdateAdminCategoryDto } from './dto/admin-category.dto';

@Injectable()
export class AdminCategoriesService {
  constructor(private readonly repository: AdminCategoriesRepository) {}

  async listCategories(query: { type?: 'income' | 'expense'; isActive?: boolean }) {
    const filter: Record<string, unknown> = { user: null };
    if (query.type) filter.type = query.type;
    if (typeof query.isActive === 'boolean') filter.isActive = query.isActive;
    const categories = await this.repository.find(filter);
    const settings = await this.repository.getPolicy();
    return { categories, settings };
  }

  async createCategory(dto: AdminCategoryDto, updatedBy?: string | null) {
    if (dto.isDefault) await this.repository.updateMany({ user: null, type: dto.type }, { isDefault: false });
    const category = await this.repository.create({
      user: null,
      name: dto.name.trim(),
      type: dto.type,
      isDefault: Boolean(dto.isDefault),
      isActive: true,
    });
    await this.ensureSettings(updatedBy);
    return { category };
  }

  async updateCategory(id: string, dto: UpdateAdminCategoryDto, updatedBy?: string | null) {
    const category = await this.repository.findById(id);
    if (!category) throw new NotFoundException('Category not found');
    if (dto.name !== undefined) category.name = dto.name.trim();
    if (dto.isActive !== undefined) category.isActive = dto.isActive;
    await category.save();
    await this.ensureSettings(updatedBy);
    return { category };
  }

  async setDefaultCategory(id: string, updatedBy?: string | null) {
    const category = await this.repository.findById(id);
    if (!category) throw new NotFoundException('Category not found');
    await this.repository.updateMany({ user: null, type: category.type }, { isDefault: false });
    category.isDefault = true;
    category.isActive = true;
    await category.save();
    await this.ensureSettings(updatedBy);
    return { category };
  }

  async deleteCategory(id: string) {
    const category = await this.repository.findById(id);
    if (!category) throw new NotFoundException('Category not found');
    category.isActive = false;
    category.isDefault = false;
    await category.save();
    return { category };
  }

  async updateCategoryLimit(defaultCategoryLimit: number, updatedBy?: string | null) {
    const settings = await this.repository.getPolicy();
    settings.defaultCategoryLimit = defaultCategoryLimit;
    settings.updatedBy = updatedBy ?? null;
    await settings.save();
    return { settings };
  }

  private async ensureSettings(updatedBy?: string | null) {
    const settings = await this.repository.getPolicy();
    settings.updatedBy = updatedBy ?? settings.updatedBy;
    await settings.save();
    return settings;
  }
}

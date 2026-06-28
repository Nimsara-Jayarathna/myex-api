import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from './schemas/category.schema';
import {
  AdminCategoryPolicy,
  AdminCategoryPolicySchema,
} from '../admin/categories/schemas/admin-category-policy.schema';
import { CategoriesRepository } from './categories.repository';
import { CategoriesService } from './categories.service';
import { CategoryDefaultsService } from './category-defaults.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: AdminCategoryPolicy.name, schema: AdminCategoryPolicySchema },
    ]),
  ],
  providers: [CategoriesRepository, CategoriesService, CategoryDefaultsService],
  exports: [MongooseModule, CategoriesRepository, CategoriesService, CategoryDefaultsService],
})
export class CategoriesModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from '../../categories/schemas/category.schema';
import { AdminCategoryPolicy, AdminCategoryPolicySchema } from './schemas/admin-category-policy.schema';
import { AdminCategoriesRepository } from './admin-categories.repository';
import { AdminCategoriesService } from './admin-categories.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: AdminCategoryPolicy.name, schema: AdminCategoryPolicySchema },
    ]),
  ],
  providers: [AdminCategoriesRepository, AdminCategoriesService],
  exports: [MongooseModule, AdminCategoriesRepository, AdminCategoriesService],
})
export class AdminCategoriesModule {}

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import type { UserDocument } from '../../../../../modules/users/schemas/user.schema';
import { CategoriesService } from '../../../../../modules/categories/categories.service';
import { CreateCategoryDto } from '../../../../../modules/categories/dto/create-category.dto';
import { UpdateCategoryDto } from '../../../../../modules/categories/dto/update-category.dto';
import { CategoryQueryDto } from '../../../../../modules/categories/dto/category-query.dto';

@Controller('api/v1/categories')
@UseGuards(JwtAuthGuard)
export class CategoriesV1Controller {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('active')
  listActive(@CurrentUser() user: UserDocument, @Query() query: CategoryQueryDto) {
    return this.categoriesService.listActiveCategories(user, query.type);
  }

  @Get('all')
  listAll(@CurrentUser() user: UserDocument, @Query() query: CategoryQueryDto) {
    return this.categoriesService.listAllCategories(user, query.type);
  }

  @Post()
  create(@CurrentUser() user: UserDocument, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.createCategory(user, dto);
  }

  @Patch(':id')
  setDefault(@CurrentUser() user: UserDocument, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.setDefaultCategory(user, id, dto);
  }

  @Delete(':id')
  archive(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.categoriesService.archiveCategory(user, id);
  }
}

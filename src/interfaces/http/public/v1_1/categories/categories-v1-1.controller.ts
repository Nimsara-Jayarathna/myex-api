import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ResponseMode } from '../../../../../common/decorators/response-mode.decorator';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import type { UserDocument } from '../../../../../modules/users/schemas/user.schema';
import { CategoriesService } from '../../../../../modules/categories/categories.service';
import { CreateCategoryDto } from '../../../../../modules/categories/dto/create-category.dto';
import { UpdateCategoryDto } from '../../../../../modules/categories/dto/update-category.dto';
import { CategoryQueryDto } from '../../../../../modules/categories/dto/category-query.dto';

@ResponseMode('legacy')
@Controller('api/v1.1/categories')
@UseGuards(JwtAuthGuard)
export class CategoriesV11Controller {
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
  async create(
    @CurrentUser() user: UserDocument,
    @Body() dto: CreateCategoryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.categoriesService.createCategory(user, dto);
    res.status(result.reactivated ? 200 : 201);
    return result;
  }

  @Patch(':id')
  setDefault(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.setDefaultCategory(user, id, dto);
  }

  @Delete(':id')
  archive(@CurrentUser() user: UserDocument, @Param('id') id: string) {
    return this.categoriesService.archiveCategory(user, id);
  }
}

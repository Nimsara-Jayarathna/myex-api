import { IsIn, IsOptional } from 'class-validator';

export class CategoryQueryDto {
  @IsOptional()
  @IsIn(['income', 'expense'])
  type?: 'income' | 'expense';
}

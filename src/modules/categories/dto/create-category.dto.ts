import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  name!: string;

  @IsIn(['income', 'expense'])
  type!: 'income' | 'expense';

  @IsOptional()
  isDefault?: boolean;
}

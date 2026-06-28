import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminCategoryDto {
  @IsString()
  name!: string;

  @IsIn(['income', 'expense'])
  type!: 'income' | 'expense';

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAdminCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategorySettingsDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  defaultCategoryLimit!: number;
}

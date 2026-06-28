import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AdminCurrencyDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsString()
  symbol!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAdminCurrencyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

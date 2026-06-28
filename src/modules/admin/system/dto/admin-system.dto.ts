import { IsBoolean, IsEmail, IsMongoId, IsOptional, IsString } from 'class-validator';

export class RunBackupDto {
  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;
}

export class CreateDeleteRequestDto {
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsString()
  userName!: string;

  @IsEmail()
  userEmail!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class DecideDeleteRequestDto {
  @IsString()
  decision!: 'approved' | 'denied';

  @IsOptional()
  @IsString()
  reviewNote?: string;
}

import { IsBoolean, IsEmail, IsIn, IsMongoId, IsOptional, IsString } from 'class-validator';

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
  @IsIn(['approve', 'deny', 'approved', 'denied'])
  decision!: 'approve' | 'deny' | 'approved' | 'denied';

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  reviewNote?: string;
}

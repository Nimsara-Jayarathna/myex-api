import { IsOptional, IsString } from 'class-validator';

export class AdminOtpVerifyDto {
  @IsString()
  otp!: string;

  @IsOptional()
  @IsString()
  challengeToken?: string;
}

export class AdminOtpActionDto {
  @IsOptional()
  @IsString()
  challengeToken?: string;
}

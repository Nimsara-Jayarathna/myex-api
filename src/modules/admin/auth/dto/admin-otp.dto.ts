import { IsString } from 'class-validator';

export class AdminOtpVerifyDto {
  @IsString()
  challengeToken!: string;

  @IsString()
  otp!: string;
}

export class AdminOtpActionDto {
  @IsString()
  challengeToken!: string;
}

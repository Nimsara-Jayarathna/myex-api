import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDetailsDto {
  @IsOptional()
  @IsString()
  fname?: string;

  @IsOptional()
  @IsString()
  lname?: string;

  @IsOptional()
  @IsString()
  name?: string;
}

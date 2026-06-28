import { IsMongoId } from 'class-validator';

export class UpdateUserCurrencyDto {
  @IsMongoId()
  currencyId!: string;
}

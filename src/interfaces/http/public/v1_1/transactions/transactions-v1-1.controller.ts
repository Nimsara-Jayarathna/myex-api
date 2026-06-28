import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ResponseMode } from '../../../../../common/decorators/response-mode.decorator';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import type { UserDocument } from '../../../../../modules/users/schemas/user.schema';
import { TransactionsService } from '../../../../../modules/transactions/transactions.service';
import { CreateTransactionDto } from '../../../../../modules/transactions/dto/create-transaction.dto';
import { UpdateTransactionDto } from '../../../../../modules/transactions/dto/update-transaction.dto';
import { TransactionFilterDto } from '../../../../../modules/transactions/dto/transaction-filter.dto';

@ResponseMode('legacy')
@Controller('api/v1.1/transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsV11Controller {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@CurrentUser() user: UserDocument, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.createTransaction(user, dto, false);
  }

  @Post('custom')
  createCustom(@CurrentUser() user: UserDocument, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.createTransaction(user, dto, true);
  }

  @Get()
  list(@CurrentUser() user: UserDocument, @Query() query: TransactionFilterDto) {
    return this.transactionsService.getTransactions(user, query);
  }

  @Get('summary')
  summary(@CurrentUser() user: UserDocument) {
    return this.transactionsService.getSummary(user);
  }

  @Put(':id')
  update(@CurrentUser() user: UserDocument, @Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.transactionsService.updateTransaction(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: UserDocument, @Param('id') id: string): Promise<void> {
    await this.transactionsService.deleteTransaction(user, id);
  }
}

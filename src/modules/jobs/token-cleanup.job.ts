import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthRepository } from '../auth/auth.repository';
import { logger } from '../../common/utils/logger';

@Injectable()
export class TokenCleanupJob {
  constructor(private readonly authRepository: AuthRepository) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async cleanupExpiredTokens(): Promise<void> {
    const result = await this.authRepository.deleteExpiredTokens();
    if (result.deletedCount > 0) {
      logger.info({ message: 'Expired auth tokens cleaned', deletedCount: result.deletedCount });
    }
  }
}

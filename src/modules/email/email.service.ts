import { Injectable } from '@nestjs/common';
import { logger, maskEmail } from '../../common/utils/logger';

@Injectable()
export class EmailService {
  async sendOtp(email: string, otp: string): Promise<void> {
    logger.info({ message: 'OTP email queued', email: maskEmail(email), otpPreview: otp });
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    logger.info({ message: 'Password reset email queued', email: maskEmail(email), tokenPreview: token });
  }

  async sendTemporaryPassword(email: string, temporaryPassword: string): Promise<void> {
    logger.info({ message: 'Temporary password email queued', email: maskEmail(email), temporaryPasswordPreview: temporaryPassword });
  }
}

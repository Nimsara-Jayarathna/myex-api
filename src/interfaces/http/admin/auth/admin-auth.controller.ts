import { Body, Controller, Get, HttpCode, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ResponseMode } from '../../../../common/decorators/response-mode.decorator';
import { ResponseMessage } from '../../../../common/decorators/response-message.decorator';
import { AdminAuthService } from '../../../../modules/admin/auth/admin-auth.service';
import { AdminLoginDto } from '../../../../modules/admin/auth/dto/admin-login.dto';
import { AdminOtpActionDto, AdminOtpVerifyDto } from '../../../../modules/admin/auth/dto/admin-otp.dto';
import { AdminJwtGuard } from '../../../../common/guards/admin-jwt.guard';
import { CurrentAdmin } from '../../../../common/decorators/current-admin.decorator';
import type { AdminUserDocument } from '../../../../modules/admin/auth/schemas/admin-user.schema';

@ResponseMode('admin')
@Controller('internal/admin/auth')
export class InternalAdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @HttpCode(200)
  @ResponseMessage('Verification code sent to your email.')
  async login(@Body() dto: AdminLoginDto) {
    const challenge = await this.adminAuthService.login(dto.email, dto.password);
    return { otpRequired: true, ...challenge };
  }

  @Post('otp/verify')
  @HttpCode(200)
  @ResponseMessage('Verification successful.')
  async verifyOtp(@Body() dto: AdminOtpVerifyDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.adminAuthService.verifyOtp(dto.challengeToken, dto.otp);
    res.cookie('adminAccessToken', result.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000,
    });
    return {
      admin: result.admin,
      session: result.session,
    };
  }

  @Post('otp/resend')
  @HttpCode(200)
  @ResponseMessage('Verification code resent.')
  resendOtp(@Body() dto: AdminOtpActionDto) {
    return this.adminAuthService.resendOtp(dto.challengeToken);
  }

  @Get('otp/status')
  @ResponseMessage('OTP challenge active.')
  otpStatus(@Query('challengeToken') challengeToken: string) {
    return this.adminAuthService.otpStatus(challengeToken);
  }

  @Post('otp/cancel')
  @HttpCode(200)
  @ResponseMessage('OTP challenge cancelled.')
  cancelOtp(@Body() dto: AdminOtpActionDto) {
    return this.adminAuthService.cancelOtp(dto.challengeToken);
  }

  @Get('session')
  @UseGuards(AdminJwtGuard)
  @ResponseMessage('Session active.')
  session(@CurrentAdmin() admin: AdminUserDocument) {
    return {
      authenticated: true,
      admin: this.adminAuthService.sanitizeAdmin(admin),
      session: { accessTokenExpiresInSeconds: 15 * 60 },
    };
  }

  @Post('logout')
  @HttpCode(200)
  @ResponseMessage('Logged out successfully.')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('adminAccessToken');
    return {};
  }
}

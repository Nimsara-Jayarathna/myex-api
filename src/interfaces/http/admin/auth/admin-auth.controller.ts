import { Body, Controller, Get, HttpCode, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AdminAuthService } from '../../../../modules/admin/auth/admin-auth.service';
import { AdminLoginDto } from '../../../../modules/admin/auth/dto/admin-login.dto';
import { AdminOtpActionDto, AdminOtpVerifyDto } from '../../../../modules/admin/auth/dto/admin-otp.dto';
import { AdminJwtGuard } from '../../../../common/guards/admin-jwt.guard';
import { CurrentAdmin } from '../../../../common/decorators/current-admin.decorator';
import type { AdminUserDocument } from '../../../../modules/admin/auth/schemas/admin-user.schema';

@Controller('internal/admin/auth')
export class InternalAdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto.email, dto.password);
  }

  @Post('otp/verify')
  async verifyOtp(@Body() dto: AdminOtpVerifyDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.adminAuthService.verifyOtp(dto.challengeToken, dto.otp);
    res.cookie('adminAccessToken', result.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000,
    });
    return result;
  }

  @Post('otp/resend')
  resendOtp(@Body() dto: AdminOtpActionDto) {
    return this.adminAuthService.resendOtp(dto.challengeToken);
  }

  @Get('otp/status')
  otpStatus(@Query('challengeToken') challengeToken: string) {
    return this.adminAuthService.otpStatus(challengeToken);
  }

  @Post('otp/cancel')
  cancelOtp(@Body() dto: AdminOtpActionDto) {
    return this.adminAuthService.cancelOtp(dto.challengeToken);
  }

  @Get('session')
  @UseGuards(AdminJwtGuard)
  session(@CurrentAdmin() admin: AdminUserDocument) {
    return { admin: this.adminAuthService.sanitizeAdmin(admin) };
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('adminAccessToken');
  }
}

import { Body, Controller, Get, HttpCode, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ResponseMode } from '../../../../common/decorators/response-mode.decorator';
import { ResponseMessage } from '../../../../common/decorators/response-message.decorator';
import { AdminAuthService } from '../../../../modules/admin/auth/admin-auth.service';
import { AdminLoginDto } from '../../../../modules/admin/auth/dto/admin-login.dto';
import {
  AdminOtpActionDto,
  AdminOtpVerifyDto,
} from '../../../../modules/admin/auth/dto/admin-otp.dto';
import { AdminJwtGuard } from '../../../../common/guards/admin-jwt.guard';
import { CurrentAdmin } from '../../../../common/decorators/current-admin.decorator';
import type { AdminUserDocument } from '../../../../modules/admin/auth/schemas/admin-user.schema';

const ADMIN_ACCESS_TOKEN_COOKIE = 'adminAccessToken';
const ADMIN_OTP_CHALLENGE_COOKIE = 'adminOtpChallengeToken';
const OTP_COOKIE_MAX_AGE_MS = Number(process.env.ADMIN_OTP_TTL_SECONDS ?? 10 * 60) * 1000;

@ResponseMode('admin')
@Controller('internal/admin/auth')
export class InternalAdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @HttpCode(200)
  @ResponseMessage('Verification code sent to your email.')
  async login(@Body() dto: AdminLoginDto, @Res({ passthrough: true }) res: Response) {
    const challenge = await this.adminAuthService.login(dto.email, dto.password);
    res.clearCookie(ADMIN_ACCESS_TOKEN_COOKIE);
    res.cookie(ADMIN_OTP_CHALLENGE_COOKIE, challenge.challengeToken, this.otpCookieOptions());

    return {
      otpRequired: challenge.otpRequired,
      challengeId: challenge.challengeId,
      maskedEmail: challenge.maskedEmail,
      otpExpiresInSeconds: challenge.otpExpiresInSeconds,
      remainingAttempts: challenge.remainingAttempts,
      maxAttempts: challenge.maxAttempts,
      lockoutRemainingSeconds: challenge.lockoutRemainingSeconds,
      resendAvailableInSeconds: challenge.resendAvailableInSeconds,
      status: challenge.status,
    };
  }

  @Post('otp/verify')
  @HttpCode(200)
  @ResponseMessage('Verification successful.')
  async verifyOtp(
    @Body() dto: AdminOtpVerifyDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.adminAuthService.verifyOtp(
      this.resolveChallengeToken(req, dto.challengeToken),
      dto.otp,
    );
    res.clearCookie(ADMIN_OTP_CHALLENGE_COOKIE);
    res.cookie(ADMIN_ACCESS_TOKEN_COOKIE, result.accessToken, this.accessTokenCookieOptions());
    return {
      admin: result.admin,
      session: result.session,
    };
  }

  @Post('otp/resend')
  @HttpCode(200)
  @ResponseMessage('Verification code resent.')
  resendOtp(@Body() dto: AdminOtpActionDto, @Req() req: Request) {
    return this.adminAuthService.resendOtp(this.resolveChallengeToken(req, dto.challengeToken));
  }

  @Get('otp/status')
  @ResponseMessage('OTP challenge active.')
  otpStatus(@Query('challengeToken') challengeToken: string | undefined, @Req() req: Request) {
    return this.adminAuthService.otpStatus(this.resolveChallengeToken(req, challengeToken));
  }

  @Post('otp/cancel')
  @HttpCode(200)
  @ResponseMessage('OTP challenge cancelled.')
  async cancelOtp(
    @Body() dto: AdminOtpActionDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const status = await this.adminAuthService.cancelOtp(
      this.resolveChallengeToken(req, dto.challengeToken),
    );
    res.clearCookie(ADMIN_OTP_CHALLENGE_COOKIE);
    return status;
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
    res.clearCookie(ADMIN_ACCESS_TOKEN_COOKIE);
    res.clearCookie(ADMIN_OTP_CHALLENGE_COOKIE);
    return {};
  }

  private resolveChallengeToken(request: Request, explicitToken?: string): string | undefined {
    const cookies = request.cookies as Record<string, string | undefined> | undefined;
    return cookies?.[ADMIN_OTP_CHALLENGE_COOKIE] ?? explicitToken;
  }

  private otpCookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      maxAge: OTP_COOKIE_MAX_AGE_MS,
    };
  }

  private accessTokenCookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000,
    };
  }
}

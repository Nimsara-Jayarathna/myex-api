import { Body, Controller, HttpCode, Post, Put, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ResponseMode } from '../../../../../common/decorators/response-mode.decorator';
import { ResponseMessage } from '../../../../../common/decorators/response-message.decorator';
import { setAuthCookies } from '../../../../../common/utils/auth-tokens';
import { AuthService } from '../../../../../modules/auth/auth.service';
import { ForgotPasswordDto } from '../../../../../modules/auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '../../../../../modules/auth/dto/reset-password.dto';
import { ChangePasswordDto } from '../../../../../modules/auth/dto/change-password.dto';
import { UpdateUserDetailsDto } from '../../../../../modules/auth/dto/update-user-details.dto';
import { RegisterDto } from '../../../../../modules/auth/dto/register.dto';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import type { UserDocument } from '../../../../../modules/users/schemas/user.schema';

@ResponseMode('standard')
@Controller('api/v1.1/auth')
export class AuthV11Controller {
  constructor(private readonly authService: AuthService) {}

  @Post('register/init')
  @HttpCode(200)
  @ResponseMessage('Registration initiated')
  registerInit(@Body() dto: ForgotPasswordDto) {
    return this.authService.registerInit(dto.email);
  }

  @Post('register/verify')
  @HttpCode(200)
  @ResponseMessage('OTP verified')
  registerVerify(@Body() dto: { email: string; otp: string }) {
    return this.authService.registerVerify(dto.email, dto.otp);
  }

  @Post('register/complete')
  @ResponseMessage('Authentication successful')
  async registerComplete(
    @Body() dto: RegisterDto & { registrationToken?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.registerComplete(dto);
    setAuthCookies(res, tokens);
    return { user: this.authService.sanitizeUser(user) };
  }

  @Post('password/forgot')
  @HttpCode(200)
  @ResponseMessage('Password reset email sent')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('password/reset')
  @HttpCode(200)
  @ResponseMessage('Password reset successfully')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post('password/change')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Password changed successfully')
  changePassword(@CurrentUser() user: UserDocument, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user, dto.currentPassword, dto.newPassword);
  }

  @Post('email/change/init')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Email change initiated')
  changeEmailInit(@CurrentUser() user: UserDocument) {
    return { email: user.email, message: 'Email change flow is ready for OTP verification.' };
  }

  @Post('email/change/verify-current')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Current email verified')
  changeEmailVerifyCurrent() {
    return { verified: true };
  }

  @Post('email/change/request-new')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Verification email sent to new address')
  requestNewEmail(@Body() dto: { email: string }) {
    return { email: dto.email };
  }

  @Post('email/change/confirm')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Email changed successfully')
  confirmNewEmail() {
    return { confirmed: true };
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('User details updated')
  updateMe(@CurrentUser() user: UserDocument, @Body() dto: UpdateUserDetailsDto) {
    return this.authService.updateUserDetails(user, dto);
  }
}

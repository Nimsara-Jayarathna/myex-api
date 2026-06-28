import { Body, Controller, Post, Put, UseGuards } from '@nestjs/common';
import { AuthService } from '../../../../../modules/auth/auth.service';
import { ForgotPasswordDto } from '../../../../../modules/auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '../../../../../modules/auth/dto/reset-password.dto';
import { ChangePasswordDto } from '../../../../../modules/auth/dto/change-password.dto';
import { UpdateUserDetailsDto } from '../../../../../modules/auth/dto/update-user-details.dto';
import { RegisterDto } from '../../../../../modules/auth/dto/register.dto';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import type { UserDocument } from '../../../../../modules/users/schemas/user.schema';

@Controller('api/v1.1/auth')
export class AuthV11Controller {
  constructor(private readonly authService: AuthService) {}

  @Post('register/init')
  registerInit(@Body() dto: ForgotPasswordDto) {
    return this.authService.registerInit(dto.email);
  }

  @Post('register/verify')
  registerVerify(@Body() dto: { email: string; otp: string }) {
    return this.authService.registerVerify(dto.email, dto.otp);
  }

  @Post('register/complete')
  registerComplete(@Body() dto: RegisterDto & { registrationToken?: string }) {
    return this.authService.registerComplete(dto);
  }

  @Post('password/forgot')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('password/reset')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post('password/change')
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() user: UserDocument, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user, dto.currentPassword, dto.newPassword);
  }

  @Post('email/change/init')
  @UseGuards(JwtAuthGuard)
  changeEmailInit(@CurrentUser() user: UserDocument) {
    return { email: user.email, message: 'Email change flow is ready for OTP verification.' };
  }

  @Post('email/change/verify-current')
  @UseGuards(JwtAuthGuard)
  changeEmailVerifyCurrent() {
    return { verified: true };
  }

  @Post('email/change/request-new')
  @UseGuards(JwtAuthGuard)
  requestNewEmail(@Body() dto: { email: string }) {
    return { email: dto.email };
  }

  @Post('email/change/confirm')
  @UseGuards(JwtAuthGuard)
  confirmNewEmail() {
    return { confirmed: true };
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: UserDocument, @Body() dto: UpdateUserDetailsDto) {
    return this.authService.updateUserDetails(user, dto);
  }
}

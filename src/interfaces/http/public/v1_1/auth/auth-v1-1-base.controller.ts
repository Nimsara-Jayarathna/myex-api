import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ResponseMode } from '../../../../../common/decorators/response-mode.decorator';
import { AuthService } from '../../../../../modules/auth/auth.service';
import { RegisterDto } from '../../../../../modules/auth/dto/register.dto';
import { LoginDto } from '../../../../../modules/auth/dto/login.dto';
import { JwtAuthGuard } from '../../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import type { UserDocument } from '../../../../../modules/users/schemas/user.schema';
import { clearAuthCookies, setAuthCookies } from '../../../../../common/utils/auth-tokens';

@ResponseMode('legacy')
@Controller('api/v1.1/auth')
export class AuthCompatV11Controller {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.authService.registerUser(dto);
    setAuthCookies(res, tokens);
    return { user: this.authService.sanitizeUser(user) };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.authService.loginUser(dto);
    setAuthCookies(res, tokens);
    return { user: this.authService.sanitizeUser(user) };
  }

  @Get('session')
  async getSession(@Req() req: Request) {
    const user = await this.authService.getUserSession(
      (req.cookies as Record<string, string> | undefined)?.accessToken,
    );
    return { user: this.authService.sanitizeUser(user) };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.authService.refreshUserSession(
      (req.cookies as Record<string, string> | undefined)?.refreshToken,
    );
    setAuthCookies(res, tokens);
    return { user: this.authService.sanitizeUser(user) };
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    clearAuthCookies(res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: UserDocument) {
    return { user: this.authService.sanitizeUser(user) };
  }
}

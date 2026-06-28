import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Request } from 'express';
import type { Model } from 'mongoose';
import { AUTH_COOKIE_NAMES } from '../constants/app.constants';
import { verifyAccessToken } from '../utils/auth-tokens';
import { User, type UserDocument } from '../../modules/users/schemas/user.schema';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: UserDocument }>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Access token missing');

    const decoded = verifyAccessToken(token);
    const user = await this.userModel
      .findById(decoded.userId)
      .select('-password')
      .populate('currency');
    if (!user) throw new UnauthorizedException('User not found for this token');
    if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      throw new UnauthorizedException('Session expired');
    }
    request.user = user;
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const authHeader = request.get('authorization');
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
    return (request.cookies as Record<string, string> | undefined)?.[AUTH_COOKIE_NAMES.access];
  }
}

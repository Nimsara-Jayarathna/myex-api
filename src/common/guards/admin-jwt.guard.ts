import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import type { Model } from 'mongoose';
import { AdminUser, type AdminUserDocument } from '../../modules/admin/auth/schemas/admin-user.schema';

interface AdminPayload {
  adminId: string;
  type: 'admin';
}

@Injectable()
export class AdminJwtGuard implements CanActivate {
  constructor(@InjectModel(AdminUser.name) private readonly adminModel: Model<AdminUserDocument>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { admin?: AdminUserDocument }>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Admin access token missing');

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET ?? 'local-access-secret') as AdminPayload;
    if (decoded.type !== 'admin') throw new UnauthorizedException('Invalid admin token');

    const admin = await this.adminModel.findById(decoded.adminId);
    if (!admin || !admin.isActive) throw new UnauthorizedException('Admin account is inactive');
    request.admin = admin;
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const authHeader = request.get('authorization');
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
    return (request.cookies as Record<string, string> | undefined)?.adminAccessToken;
  }
}

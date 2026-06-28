import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import { getClientIp } from '../utils/logger';

@Injectable()
export class AdminIpAllowlistGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const allowlist = (process.env.ADMIN_IP_ALLOWLIST ?? '')
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);

    if (allowlist.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = getClientIp(request);
    if (!allowlist.includes(clientIp)) {
      throw new ForbiddenException('Admin access is not allowed from this IP address');
    }
    return true;
  }
}

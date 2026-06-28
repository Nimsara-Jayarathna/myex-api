import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { getClientIp } from '../utils/logger';

interface WindowState {
  count: number;
  resetAt: number;
}

@Injectable()
export class AdminRateLimiter implements CanActivate {
  private readonly store = new Map<string, WindowState>();
  private readonly ttlMs = 60_000;
  private readonly limit = 60;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = getClientIp(request);
    const now = Date.now();
    const current = this.store.get(key);

    if (!current || current.resetAt <= now) {
      this.store.set(key, { count: 1, resetAt: now + this.ttlMs });
      return true;
    }

    current.count += 1;
    if (current.count > this.limit) {
      throw new HttpException(
        'Too many admin requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}

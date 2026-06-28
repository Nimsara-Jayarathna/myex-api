import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ admin?: { roles?: string[] } }>();
    const roles = request.admin?.roles ?? [];
    return roles.includes('super_admin') || roles.includes('admin');
  }
}

import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AdminUserDocument } from '../../modules/admin/auth/schemas/admin-user.schema';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminUserDocument | undefined => {
    const request = ctx.switchToHttp().getRequest<{ admin?: AdminUserDocument }>();
    return request.admin;
  },
);

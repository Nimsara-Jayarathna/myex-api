import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { UserDocument } from '../../modules/users/schemas/user.schema';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserDocument | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: UserDocument }>();
    return request.user;
  },
);

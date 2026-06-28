import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

@Injectable()
export class AdminRoleGuard extends RolesGuard {
  constructor(reflector: Reflector) {
    super(reflector);
  }
}

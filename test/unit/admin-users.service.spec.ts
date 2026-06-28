import { NotFoundException } from '@nestjs/common';
import { AdminUsersService } from '../../src/modules/admin/users/admin-users.service';

describe('AdminUsersService', () => {
  it('throws when user is not found', async () => {
    const service = new AdminUsersService(
      { findById: jest.fn().mockResolvedValue(null) } as never,
      { sendTemporaryPassword: jest.fn() } as never,
    );
    await expect(service.getUserById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});

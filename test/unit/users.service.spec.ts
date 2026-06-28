import { NotFoundException } from '@nestjs/common';
import { UsersService } from '../../src/modules/users/users.service';

describe('UsersService', () => {
  it('throws when user is missing', async () => {
    const service = new UsersService({ findById: jest.fn().mockResolvedValue(null) } as never);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});

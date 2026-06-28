import { UnauthorizedException } from '@nestjs/common';
import { AdminAuthService } from '../../src/modules/admin/auth/admin-auth.service';

describe('AdminAuthService', () => {
  it('rejects missing admin login', async () => {
    const service = new AdminAuthService(
      { findByEmailWithPassword: jest.fn().mockResolvedValue(null) } as never,
      { sendOtp: jest.fn() } as never,
    );
    await expect(service.login('admin@example.com', 'wrong')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

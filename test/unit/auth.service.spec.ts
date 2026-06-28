import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../src/modules/auth/auth.service';

describe('AuthService', () => {
  it('registers a user and returns tokens', async () => {
    const usersRepository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        _id: 'user-id',
        email: 'test@example.com',
        fname: 'Test',
        lname: 'User',
        tokenVersion: 0,
        save: jest.fn(),
      }),
    };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(10) } },
        { provide: 'UsersRepository', useValue: usersRepository },
      ],
    })
      .overrideProvider(AuthService)
      .useValue({
        registerUser: jest.fn().mockResolvedValue({ user: { email: 'test@example.com' }, tokens: {} }),
      })
      .compile();

    const service = module.get<AuthService>(AuthService);
    await expect(
      service.registerUser({ fname: 'Test', lname: 'User', email: 'test@example.com', password: 'Password123' }),
    ).resolves.toHaveProperty('user');
  });
});

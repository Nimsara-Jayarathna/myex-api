import { NotFoundException } from '@nestjs/common';
import { CurrenciesService } from '../../src/modules/currencies/currencies.service';

describe('CurrenciesService', () => {
  it('throws when updating to an unknown currency', async () => {
    const service = new CurrenciesService(
      { findById: jest.fn().mockResolvedValue(null) } as never,
      {} as never,
    );
    await expect(service.updateUserCurrency({ _id: 'u1' } as never, 'c1')).rejects.toBeInstanceOf(NotFoundException);
  });
});

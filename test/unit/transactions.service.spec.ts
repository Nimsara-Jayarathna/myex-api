import { TransactionsService } from '../../src/modules/transactions/transactions.service';

describe('TransactionsService', () => {
  it('returns summary shape', async () => {
    const service = new TransactionsService(
      { aggregate: jest.fn().mockResolvedValue([{ totals: [], monthly: [] }]) } as never,
      {} as never,
    );
    await expect(service.getSummary({ _id: '64b000000000000000000001' } as never)).resolves.toEqual(
      {
        income: 0,
        expense: 0,
        balance: 0,
        monthly: [],
      },
    );
  });
});

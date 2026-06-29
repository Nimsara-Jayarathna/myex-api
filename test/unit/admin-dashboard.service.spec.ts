import { AdminDashboardService } from '../../src/modules/admin/dashboard/admin-dashboard.service';

describe('AdminDashboardService', () => {
  it('returns the legacy-compatible admin dashboard data contract', async () => {
    const userModel = {
      countDocuments: jest.fn().mockResolvedValueOnce(8).mockResolvedValueOnce(1),
    };
    const transactionModel = {
      aggregate: jest.fn().mockResolvedValue([{ _id: 'LKR', amount: 65695.91 }]),
    };
    const currencyModel = {
      findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ code: 'USD' }) }),
    };
    const auditModel = {
      countDocuments: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    const service = new AdminDashboardService(
      userModel as never,
      transactionModel as never,
      currencyModel as never,
      auditModel as never,
    );

    await expect(service.getDashboard({ period: '30d', eventsLimit: 6 })).resolves.toEqual({
      summary: {
        totalUsers: { value: 8, deltaPct: 0 },
        activeUsers: { value: 1, deltaPct: 0 },
        defaultCurrency: { value: 'USD', deltaPct: 0 },
        errorCount: { value: 0, deltaPct: 0 },
      },
      currencyUsage: {
        period: '30d',
        totalAmount: 65695.91,
        segments: [{ code: 'LKR', amount: 65695.91, percent: 100 }],
      },
      recentEvents: [],
    });
  });
});

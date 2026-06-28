import { BadRequestException } from '@nestjs/common';
import { CategoriesService } from '../../src/modules/categories/categories.service';

describe('CategoriesService', () => {
  it('validates category type', async () => {
    const service = new CategoriesService({ find: jest.fn() } as never);
    await expect(service.listActiveCategories({ _id: 'u1' } as never, 'wrong' as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns only one effective default per category type without changing response shape', async () => {
    const now = new Date();
    const repository = {
      find: jest.fn().mockResolvedValue([
        {
          _id: 'global-expense-default',
          user: null,
          name: 'Miscellaneous Expense',
          type: 'expense',
          isDefault: true,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          _id: 'user-expense-default-old',
          user: 'u1',
          name: 'General Expense',
          type: 'expense',
          isDefault: true,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          _id: 'user-expense-same-as-global',
          user: 'u1',
          name: 'Miscellaneous Expense',
          type: 'expense',
          isDefault: false,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          _id: 'global-income-default',
          user: null,
          name: 'General Income',
          type: 'income',
          isDefault: true,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        },
      ]),
    };

    const service = new CategoriesService(repository as never);
    const result = await service.listActiveCategories({ _id: 'u1' } as never);

    const expenseDefaults = result.categories.filter((category) => category.type === 'expense' && category.isDefault);
    const incomeDefaults = result.categories.filter((category) => category.type === 'income' && category.isDefault);

    expect(expenseDefaults).toHaveLength(1);
    expect(incomeDefaults).toHaveLength(1);
    expect(result.categories.some((category) => category.id === 'global-expense-default')).toBe(false);
    expect(result.categories[0]).toHaveProperty('id');
    expect(result.categories[0]).toHaveProperty('name');
    expect(result.categories[0]).toHaveProperty('type');
    expect(result.categories[0]).toHaveProperty('isDefault');
    expect(result.categories[0]).toHaveProperty('isGlobal');
  });
});

import { BadRequestException } from '@nestjs/common';
import { CategoriesService } from '../../src/modules/categories/categories.service';

describe('CategoriesService', () => {
  it('validates category type', async () => {
    const service = new CategoriesService({ find: jest.fn() } as never);
    await expect(service.listActiveCategories({ _id: 'u1' } as never, 'wrong' as never)).rejects.toBeInstanceOf(BadRequestException);
  });
});

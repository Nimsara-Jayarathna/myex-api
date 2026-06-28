import { sanitizeMongoValue } from '../../src/common/middleware/no-sql-sanitization.middleware';

describe('noSqlSanitizationMiddleware helpers', () => {
  it('removes mongo operator keys recursively', () => {
    const result = sanitizeMongoValue({
      email: { $ne: 'blocked@example.com' },
      profile: {
        name: 'Nimsara',
        'role.level': 'admin',
      },
      tags: [{ safe: true, $where: 'this.password' }],
    });

    expect(result).toEqual({
      email: {},
      profile: {
        name: 'Nimsara',
      },
      tags: [{ safe: true }],
    });
  });
});

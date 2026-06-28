describe('Public auth v1 e2e placeholder', () => {
  it('targets /api/v1/auth/login', () => {
    expect('/api/v1/auth/login').toContain('/api/v1');
  });
});

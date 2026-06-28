describe('Internal admin users e2e placeholder', () => {
  it('targets /internal/admin/users', () => {
    expect('/internal/admin/users').toContain('/internal/admin');
  });
});

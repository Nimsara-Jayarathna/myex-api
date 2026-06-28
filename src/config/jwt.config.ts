export default () => ({
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'local-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'local-refresh-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
});

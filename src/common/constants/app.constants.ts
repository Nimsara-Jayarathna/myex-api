export const AUTH_COOKIE_NAMES = {
  access: 'accessToken',
  refresh: 'refreshToken',
} as const;

export const PUBLIC_API_PREFIX = {
  v1: 'api/v1',
  v1_1: 'api/v1.1',
  v2: 'api/v2',
} as const;

export const INTERNAL_ADMIN_PREFIX = 'internal/admin' as const;

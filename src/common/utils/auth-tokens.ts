import type { Response } from 'express';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import { AUTH_COOKIE_NAMES } from '../constants/app.constants';

export interface AppTokenPayload extends JwtPayload {
  userId: string;
  tokenVersion: number;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

const accessSecret = (): string => process.env.JWT_ACCESS_SECRET ?? 'local-access-secret';
const refreshSecret = (): string => process.env.JWT_REFRESH_SECRET ?? 'local-refresh-secret';

export const issueTokens = (userId: string, tokenVersion = 0): IssuedTokens => {
  const payload = { userId, tokenVersion };
  const accessToken = jwt.sign(payload, accessSecret(), {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  } as SignOptions);
  const refreshToken = jwt.sign(payload, refreshSecret(), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  } as SignOptions);
  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): AppTokenPayload =>
  jwt.verify(token, accessSecret()) as AppTokenPayload;

export const verifyRefreshToken = (token: string): AppTokenPayload =>
  jwt.verify(token, refreshSecret()) as AppTokenPayload;

export const setAuthCookies = (res: Response, tokens: IssuedTokens): void => {
  const secure = process.env.NODE_ENV === 'production';
  res.cookie(AUTH_COOKIE_NAMES.access, tokens.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(AUTH_COOKIE_NAMES.refresh, tokens.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookies = (res: Response): void => {
  res.clearCookie(AUTH_COOKIE_NAMES.access);
  res.clearCookie(AUTH_COOKIE_NAMES.refresh);
};

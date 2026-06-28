import type { Request } from 'express';

export interface AdminRequestMeta {
  requestId: string;
  timestamp: string;
}

type RequestWithAdminMeta = Request & { adminRequestId?: string };

const makeRequestId = (): string => `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const getAdminRequestMeta = (request: Request): AdminRequestMeta => {
  const req = request as RequestWithAdminMeta;
  const headerValue = request.headers['x-request-id'];
  const requestId =
    req.adminRequestId ??
    (Array.isArray(headerValue) ? headerValue[0] : headerValue) ??
    makeRequestId();

  req.adminRequestId = requestId;

  return {
    requestId,
    timestamp: new Date().toISOString(),
  };
};

export const isAdminRoute = (path: string): boolean => path.startsWith('/internal/admin');
export const isV11Route = (path: string): boolean => path.startsWith('/api/v1.1');
export const isV1Route = (path: string): boolean => path.startsWith('/api/v1');

import { apiError, apiSuccess, adminSuccess, adminError } from '../../src/common/utils/response';
import { ERROR_CODES } from '../../src/common/constants/error-codes';

describe('response contract helpers', () => {
  it('keeps v1.1 success response format compatible with main branch', () => {
    expect(apiSuccess({ currencies: [] }, 'Currencies retrieved successfully')).toEqual({
      success: true,
      message: 'Currencies retrieved successfully',
      data: { currencies: [] },
    });
  });

  it('keeps v1.1 error response format compatible with main branch', () => {
    expect(apiError(ERROR_CODES.VALIDATION_ERROR, 'Validation Error', { email: 'Email is required' })).toEqual({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation Error',
        details: { email: 'Email is required' },
      },
    });
  });

  it('keeps internal admin success response format compatible with main branch', () => {
    const request = {
      headers: { 'x-request-id': 'req-test' },
    } as never;

    expect(adminSuccess(request, { users: [] }, 'Users loaded.')).toEqual({
      success: true,
      message: 'Users loaded.',
      data: { users: [] },
      meta: {
        requestId: 'req-test',
        timestamp: expect.any(String),
      },
    });
  });

  it('keeps internal admin error response format compatible with main branch', () => {
    const request = {
      headers: { 'x-request-id': 'req-test' },
    } as never;

    expect(adminError(request, 'Unauthorized', { token: 'Invalid token' })).toEqual({
      success: false,
      message: 'Unauthorized',
      errors: { token: 'Invalid token' },
      meta: {
        requestId: 'req-test',
        timestamp: expect.any(String),
      },
    });
  });
});

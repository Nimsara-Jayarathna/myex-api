export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

export const apiSuccess = <T>(data: T, message = 'Operation successful'): ApiSuccessResponse<T> => ({
  success: true,
  message,
  data,
});

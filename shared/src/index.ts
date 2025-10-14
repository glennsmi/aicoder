// Types
export * from './types/common';
export * from './types/currency';
export * from './types/usage';

// Schemas
export * from './schemas/user';

// Utilities
export const createApiResponse = <T>(
  success: boolean,
  data?: T,
  error?: string,
  message?: string
) => ({
  success,
  data,
  error,
  message,
});

export const createErrorResponse = (error: string, message?: string) =>
  createApiResponse(false, undefined, error, message);

export const createSuccessResponse = <T>(data: T, message?: string) =>
  createApiResponse(true, data, undefined, message); 
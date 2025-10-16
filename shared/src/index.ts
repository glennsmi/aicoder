// Types
export * from './types/common';
export * from './types/currency';
export * from './types/usage';
export * from './types/organization';
export * from './types/team';
export * from './types/billing';
export * from './types/apiConnector';
export * from './types/apiConnections';
export * from './types/invitation';

// Schemas
export * from './schemas/user';

// Utilities
export * from './utils/permissions';

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
import { z } from 'zod';

// User preferences schema
export const userPreferencesSchema = z.object({
  primaryCurrency: z.string().default('GBP'),
  secondaryCurrency: z.string().optional(),
  lastUpdated: z.union([z.date(), z.string()]).optional(),
});

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  preferences: userPreferencesSchema.optional(),
  // Multi-tenant fields
  organizationId: z.string().nullable().optional(), // null for individual users
  currentRole: z.enum(['admin', 'team_manager', 'member', 'individual']).optional(),
  tier: z.enum(['free_individual', 'paid_individual', 'team', 'enterprise']).optional(),
  // Stripe integration
  stripeCustomerId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().optional(),
  preferences: userPreferencesSchema.optional(),
  organizationId: z.string().nullable().optional(),
  currentRole: z.enum(['admin', 'team_manager', 'member', 'individual']).optional(),
  tier: z.enum(['free_individual', 'paid_individual', 'team', 'enterprise']).optional(),
});

export const updateUserSchema = z.object({
  displayName: z.string().optional(),
  preferences: userPreferencesSchema.optional(),
  organizationId: z.string().nullable().optional(),
  currentRole: z.enum(['admin', 'team_manager', 'member', 'individual']).optional(),
  tier: z.enum(['free_individual', 'paid_individual', 'team', 'enterprise']).optional(),
  stripeCustomerId: z.string().optional(),
});

export const paginationSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10),
  orderBy: z.string().optional(),
  orderDirection: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Cursor Usage Schemas
export const cursorUsageSchema = z.object({
  id: z.string().optional(),
  date: z.string(),
  model: z.string(),
  status: z.string(),
  requests: z.number(),
  costPerRequest: z.number().default(0.04),
  totalCost: z.number(),
});

export const cursorUsageRowSchema = z.object({
  date: z.string(),
  model: z.string(),
  status: z.string(),
  requests: z.union([z.number(), z.string()]).transform(val =>
    typeof val === 'string' ? parseFloat(val) || 0 : val
  ),
});

export const cursorUsageSummarySchema = z.object({
  totalRequests: z.number(),
  totalCost: z.number(),
  costPerRequest: z.number().default(0.04),
});

// Enhanced Cursor Usage Schemas (New Format)
export const tokenUsageSchema = z.object({
  input: z.number().default(0),
  output: z.number().default(0),
  cacheWrite: z.number().default(0),
  cacheRead: z.number().default(0),
});

export const enhancedCursorUsageSchema = z.object({
  id: z.string().optional(),
  date: z.string(), // "May 31, 09:53 AM"
  user: z.string().default("You"),
  billingType: z.string().default("Usage-based"),
  success: z.string().default("Yes"), // "Yes" or "No"
  model: z.string(),
  requests: z.number(), // Can be decimal like 0.7, 1.4
  tokenUsage: tokenUsageSchema,
  totalCost: z.number(),
  // Computed fields
  costPerRequest: z.number().optional(),
  parsedDate: z.date().optional(), // For internal use after parsing
});

export const enhancedCursorUsageRowSchema = z.object({
  date: z.string(),
  user: z.string().default("You"),
  billingType: z.string().default("Usage-based"),
  success: z.string().default("Yes"),
  model: z.string(),
  requests: z.union([z.number(), z.string()]).transform(val =>
    typeof val === 'string' ? parseFloat(val) || 0 : val
  ),
  inputTokens: z.union([z.number(), z.string()]).transform(val =>
    typeof val === 'string' ? parseInt(val) || 0 : val
  ).default(0),
  outputTokens: z.union([z.number(), z.string()]).transform(val =>
    typeof val === 'string' ? parseInt(val) || 0 : val
  ).default(0),
  cacheWriteTokens: z.union([z.number(), z.string()]).transform(val =>
    typeof val === 'string' ? parseInt(val) || 0 : val
  ).default(0),
  cacheReadTokens: z.union([z.number(), z.string()]).transform(val =>
    typeof val === 'string' ? parseInt(val) || 0 : val
  ).default(0),
  totalCost: z.union([z.number(), z.string()]).transform(val =>
    typeof val === 'string' ? parseFloat(val.replace('$', '')) || 0 : val
  ),
});

export const enhancedCursorUsageSummarySchema = z.object({
  totalRequests: z.number(),
  totalCost: z.number(),
  totalInputTokens: z.number(),
  totalOutputTokens: z.number(),
  totalCacheWriteTokens: z.number(),
  totalCacheReadTokens: z.number(),
  costPerRequest: z.number().default(0),
  avgTokensPerRequest: z.number().default(0),
});

// Firestore document schemas
export const firestoreUserSchema = userSchema.extend({
  createdAt: z.union([z.date(), z.any()]), // Allow Firestore Timestamp
  updatedAt: z.union([z.date(), z.any()]), // Allow Firestore Timestamp
  preferences: userPreferencesSchema.extend({
    lastUpdated: z.union([z.date(), z.any()]).optional(), // Allow Firestore Timestamp
  }).optional(),
  organizationId: z.string().nullable().optional(),
  currentRole: z.enum(['admin', 'team_manager', 'member', 'individual']).optional(),
  tier: z.enum(['free_individual', 'paid_individual', 'team', 'enterprise']).optional(),
  stripeCustomerId: z.string().optional(),
});

export const createFirestoreUserSchema = createUserSchema.extend({
  createdAt: z.union([z.date(), z.any()]).optional(),
  updatedAt: z.union([z.date(), z.any()]).optional(),
  preferences: userPreferencesSchema.extend({
    lastUpdated: z.union([z.date(), z.any()]).optional(),
  }).optional(),
  organizationId: z.string().nullable().optional(),
  currentRole: z.enum(['admin', 'team_manager', 'member', 'individual']).optional(),
  tier: z.enum(['free_individual', 'paid_individual', 'team', 'enterprise']).optional(),
});

// Collection names as constants
export const COLLECTIONS = {
  USERS: 'users',
  POSTS: 'posts',
  CURSOR_USAGE: 'cursor_usage',
  ENHANCED_CURSOR_USAGE: 'enhanced_cursor_usage',
  ORGANIZATIONS: 'organizations',
  INVITATIONS: 'invitations',
  SUBSCRIPTIONS: 'subscriptions',
  SYNC_HISTORY: 'syncHistory',
} as const;

export type User = z.infer<typeof userSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;
export type CursorUsage = z.infer<typeof cursorUsageSchema>;
export type CursorUsageRow = z.infer<typeof cursorUsageRowSchema>;
export type CursorUsageSummary = z.infer<typeof cursorUsageSummarySchema>;
export type TokenUsage = z.infer<typeof tokenUsageSchema>;
export type EnhancedCursorUsage = z.infer<typeof enhancedCursorUsageSchema>;
export type EnhancedCursorUsageRow = z.infer<typeof enhancedCursorUsageRowSchema>;
export type EnhancedCursorUsageSummary = z.infer<typeof enhancedCursorUsageSummarySchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type FirestoreUser = z.infer<typeof firestoreUserSchema>;
export type CreateFirestoreUser = z.infer<typeof createFirestoreUserSchema>; 
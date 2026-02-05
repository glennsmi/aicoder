import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

/**
 * Supported AI Coding Assistant Providers
 */
export type AIProvider = 
  | 'cursor'
  | 'github_copilot'
  | 'openai_codex'
  | 'openai_admin_personal'
  | 'openai_admin_org'
  | 'anthropic_usage'
  | 'anthropic_code'
  | 'claude_code'
  | 'google_cloud_billing'
  | 'gemini'
  | 'codeium'
  | 'tabnine'
  | 'replit_ghostwriter'
  | 'aws_codewhisperer';

/**
 * API Connection Status
 */
export type ConnectionStatus = 'active' | 'failed' | 'paused' | 'testing';

/**
 * Sync Status
 */
export type SyncStatus = 'success' | 'failed' | 'partial' | 'in_progress';

/**
 * API Connection Configuration
 */
export interface APIConnection {
  id: string;
  organizationId: string;
  provider: AIProvider;
  displayName: string; // User-friendly name for this connection
  credentials: EncryptedCredentials;
  status: ConnectionStatus;
  createdBy: string; // User ID who added the connection
  lastSyncAt?: Timestamp;
  nextSyncAt?: Timestamp;
  lastError?: string; // Last error message if failed
  syncFrequency: 'daily' | 'hourly' | 'manual'; // How often to sync
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Encrypted credentials (stored encrypted in Firestore)
 */
export interface EncryptedCredentials {
  encryptedData: string; // AES-256-GCM encrypted JSON
  iv: string; // Initialization vector
  authTag: string; // Authentication tag
  encryptedAt: Timestamp;
}

/**
 * Sync History Record
 */
export interface SyncHistory {
  id: string;
  connectionId: string;
  organizationId: string;
  provider: AIProvider;
  startTime: Timestamp;
  endTime?: Timestamp;
  status: SyncStatus;
  recordsSynced: number;
  recordsFailed: number;
  errors: string[];
  metadata?: {
    dateRange?: { start: string; end: string };
    totalCost?: number;
    totalTokens?: number;
    [key: string]: any;
  };
}

/**
 * Standard usage data format
 */
export interface UsageData {
  date: string; // YYYY-MM-DD
  userId?: string;
  userName?: string;
  userEmail?: string;
  model: string;
  provider: AIProvider;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  totalTokens: number;
  requests: number;
  cost: number;
  currency: string;
  metadata?: {
    language?: string;
    editor?: string;
    suggestions?: number;
    acceptances?: number;
    [key: string]: any;
  };
}

/**
 * Provider-specific credential schemas
 */
export interface GitHubCopilotCredentials {
  type: 'pat' | 'github_app';
  token: string; // Personal Access Token
  organization?: string;
  enterprise?: string;
}

export interface OpenAICredentials {
  apiKey: string;
  organizationId?: string;
}

export interface AnthropicUsageCredentials {
  apiKey: string;
}

export interface AnthropicCodeCredentials {
  apiKey: string;
}

export interface CursorCredentials {
  // CSV upload only for now
  method: 'csv';
}

export interface GeminiCredentials {
  apiKey: string;
  projectId?: string;
}

/**
 * Google Cloud Billing (via BigQuery Billing Export) credentials
 *
 * Note: The Cloud Billing REST API is primarily for billing account metadata and catalog.
 * Actual cost line items are typically ingested from BigQuery Billing Export.
 */
export interface GoogleCloudBillingCredentials {
  type: 'bigquery_billing_export';
  /**
   * Service account JSON content (stringified JSON).
   * Must have access to run BigQuery jobs and read the billing export table.
   */
  serviceAccountJson: string;
  /** BigQuery project that contains the billing export dataset */
  bigQueryProjectId: string;
  /** BigQuery dataset ID containing the billing export table */
  datasetId: string;
  /** BigQuery table ID (not a wildcard). Example: gcp_billing_export_v1_XXXXXX_YYYYYY */
  tableId: string;
  /**
   * Optional BigQuery job location (e.g. "US", "EU", "europe-west2").
   * If omitted, the connector will try sensible defaults.
   */
  bigQueryLocation?: string;
  /**
   * Optional label key used to attribute costs to a user (e.g. "developer_email").
   * Requires your GCP resources to be labeled consistently.
   */
  attributionLabelKey?: string;
}

export interface CodeiumCredentials {
  apiKey: string;
  enterpriseId?: string;
}

// Union type for all credential types
export type ProviderCredentials =
  | GitHubCopilotCredentials
  | OpenAICredentials
  | AnthropicUsageCredentials
  | AnthropicCodeCredentials
  | CursorCredentials
  | GoogleCloudBillingCredentials
  | GeminiCredentials
  | CodeiumCredentials;

// Sync result from connector
export interface SyncResult {
  success: boolean;
  recordsSynced: number;
  recordsFailed: number;
  errors: string[];
  metadata?: any;
}

// Test connection result
export interface TestConnectionResult {
  success: boolean;
  message: string;
  metadata?: {
    organizationName?: string;
    availableSeats?: number;
    billingCycle?: string;
    [key: string]: any;
  };
}

// Cloud Function request/response types
export interface TestConnectionRequest {
  provider: AIProvider;
  credentials: ProviderCredentials;
}

export interface AddConnectionRequest {
  organizationId: string;
  provider: AIProvider;
  displayName: string;
  credentials: ProviderCredentials;
  syncFrequency?: 'daily' | 'hourly' | 'manual';
}

export interface SyncConnectionRequest {
  connectionId: string;
  dateRange?: {
    start: string; // YYYY-MM-DD
    end: string;   // YYYY-MM-DD
  };
}

export interface AddConnectionResponse {
  connectionId: string;
  status: ConnectionStatus;
  message: string;
}

/**
 * Zod Schemas
 */
export const EncryptedCredentialsSchema = z.object({
  encryptedData: z.string(),
  iv: z.string(),
  authTag: z.string(),
  encryptedAt: z.any(), // Timestamp
});

export const APIConnectionSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  provider: z.enum(['cursor', 'github_copilot', 'openai_codex', 'openai_admin_personal', 'openai_admin_org', 'anthropic_usage', 'anthropic_code', 'claude_code', 'google_cloud_billing', 'gemini', 'codeium', 'tabnine', 'replit_ghostwriter', 'aws_codewhisperer']),
  displayName: z.string().min(1).max(100),
  credentials: EncryptedCredentialsSchema,
  status: z.enum(['active', 'failed', 'paused', 'testing']),
  createdBy: z.string(),
  lastSyncAt: z.any().optional(), // Timestamp
  nextSyncAt: z.any().optional(), // Timestamp
  lastError: z.string().optional(),
  syncFrequency: z.enum(['daily', 'hourly', 'manual']),
  createdAt: z.any(), // Timestamp
  updatedAt: z.any(), // Timestamp
});

export const SyncHistorySchema = z.object({
  id: z.string(),
  connectionId: z.string(),
  organizationId: z.string(),
  provider: z.enum(['cursor', 'github_copilot', 'openai_codex', 'openai_admin_personal', 'openai_admin_org', 'anthropic_usage', 'anthropic_code', 'claude_code', 'google_cloud_billing', 'gemini', 'codeium', 'tabnine', 'replit_ghostwriter', 'aws_codewhisperer']),
  startTime: z.any(), // Timestamp
  endTime: z.any().optional(), // Timestamp
  status: z.enum(['success', 'failed', 'partial', 'in_progress']),
  recordsSynced: z.number().int().min(0),
  recordsFailed: z.number().int().min(0),
  errors: z.array(z.string()),
  metadata: z.object({
    dateRange: z.object({
      start: z.string(),
      end: z.string(),
    }).optional(),
    totalCost: z.number().optional(),
    totalTokens: z.number().optional(),
  }).optional(),
});

/**
 * Helper type for creating new connections
 */
export type CreateAPIConnectionInput = Omit<APIConnection, 'id' | 'createdAt' | 'updatedAt' | 'lastSyncAt' | 'nextSyncAt'>;


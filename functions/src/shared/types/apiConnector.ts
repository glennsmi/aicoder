import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

/**
 * Supported AI Coding Assistant Providers
 */
export type AIProvider = 
  | 'cursor'
  | 'github_copilot'
  | 'codeium'
  | 'tabnine'
  | 'claude_code'
  | 'openai_codex'
  | 'replit_ghostwriter'
  | 'aws_codewhisperer';

/**
 * API Connection Status
 */
export type ConnectionStatus = 'active' | 'failed' | 'paused' | 'testing';

/**
 * Sync Status
 */
export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'failed';

/**
 * API Connection Configuration
 */
export interface APIConnection {
  id: string;
  organizationId: string;
  provider: AIProvider;
  name: string; // User-friendly name for this connection
  credentials: EncryptedCredentials;
  status: ConnectionStatus;
  addedBy: string; // User ID who added the connection
  lastSyncAt?: Date | Timestamp;
  nextSyncAt?: Date | Timestamp;
  syncFrequency: SyncFrequency; // How often to sync
  errorMessage?: string; // Last error message if failed
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

/**
 * Encrypted credentials (stored encrypted in Firestore)
 */
export interface EncryptedCredentials {
  encrypted: string; // Encrypted credential data
  iv: string; // Initialization vector for decryption
  provider: AIProvider; // Which provider these credentials are for
}

/**
 * Sync Frequency Options
 */
export type SyncFrequency = 'hourly' | 'daily' | 'weekly' | 'manual';

/**
 * Sync History Record
 */
export interface SyncHistory {
  id: string;
  connectionId: string;
  organizationId: string;
  provider: AIProvider;
  status: SyncStatus;
  startedAt: Date | Timestamp;
  completedAt?: Date | Timestamp;
  recordsProcessed: number;
  recordsFailed: number;
  errorMessage?: string;
  errorDetails?: string;
}

/**
 * Provider Metadata
 */
export interface ProviderMetadata {
  provider: AIProvider;
  name: string;
  description: string;
  websiteUrl: string;
  logoUrl?: string;
  requiresOrgAccess: boolean; // Whether org-level access is needed
  credentialFields: CredentialField[];
  documentationUrl?: string;
  supportedFeatures: string[];
}

/**
 * Credential Field Definition
 */
export interface CredentialField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'api_key' | 'oauth';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  validation?: string; // Regex pattern for validation
}

/**
 * Raw credentials before encryption (never stored)
 */
export interface RawCredentials {
  provider: AIProvider;
  [key: string]: string | undefined;
}

/**
 * Zod Schemas
 */

export const EncryptedCredentialsSchema = z.object({
  encrypted: z.string(),
  iv: z.string(),
  provider: z.enum(['cursor', 'github_copilot', 'codeium', 'tabnine', 'claude_code', 'openai_codex', 'replit_ghostwriter', 'aws_codewhisperer']),
});

export const APIConnectionSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  provider: z.enum(['cursor', 'github_copilot', 'codeium', 'tabnine', 'claude_code', 'openai_codex', 'replit_ghostwriter', 'aws_codewhisperer']),
  name: z.string().min(1).max(100),
  credentials: EncryptedCredentialsSchema,
  status: z.enum(['active', 'failed', 'paused', 'testing']),
  addedBy: z.string(),
  lastSyncAt: z.date().optional(),
  nextSyncAt: z.date().optional(),
  syncFrequency: z.enum(['hourly', 'daily', 'weekly', 'manual']),
  errorMessage: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SyncHistorySchema = z.object({
  id: z.string(),
  connectionId: z.string(),
  organizationId: z.string(),
  provider: z.enum(['cursor', 'github_copilot', 'codeium', 'tabnine', 'claude_code', 'openai_codex', 'replit_ghostwriter', 'aws_codewhisperer']),
  status: z.enum(['pending', 'syncing', 'completed', 'failed']),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  recordsProcessed: z.number().int().min(0),
  recordsFailed: z.number().int().min(0),
  errorMessage: z.string().optional(),
  errorDetails: z.string().optional(),
});

/**
 * Provider Configurations
 */
export const PROVIDER_METADATA: Record<AIProvider, ProviderMetadata> = {
  cursor: {
    provider: 'cursor',
    name: 'Cursor',
    description: 'AI-first code editor with usage tracking',
    websiteUrl: 'https://cursor.sh',
    requiresOrgAccess: false,
    credentialFields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'api_key',
        required: true,
        placeholder: 'cur_...',
        helpText: 'Find your API key in Cursor Settings > Usage',
      },
    ],
    documentationUrl: 'https://cursor.sh/docs/api',
    supportedFeatures: ['usage_tracking', 'token_breakdown', 'model_stats'],
  },
  github_copilot: {
    provider: 'github_copilot',
    name: 'GitHub Copilot',
    description: 'AI pair programmer by GitHub',
    websiteUrl: 'https://github.com/features/copilot',
    requiresOrgAccess: true,
    credentialFields: [
      {
        key: 'accessToken',
        label: 'GitHub Access Token',
        type: 'api_key',
        required: true,
        placeholder: 'ghp_...',
        helpText: 'Personal access token with org:read scope',
      },
      {
        key: 'organizationSlug',
        label: 'Organization Slug',
        type: 'text',
        required: true,
        placeholder: 'my-org',
        helpText: 'Your GitHub organization name',
      },
    ],
    documentationUrl: 'https://docs.github.com/en/rest/copilot',
    supportedFeatures: ['usage_tracking', 'seat_management'],
  },
  codeium: {
    provider: 'codeium',
    name: 'Codeium',
    description: 'Free AI-powered code completion',
    websiteUrl: 'https://codeium.com',
    requiresOrgAccess: true,
    credentialFields: [
      {
        key: 'apiKey',
        label: 'Team API Key',
        type: 'api_key',
        required: true,
        placeholder: 'cdm_...',
        helpText: 'Team admin API key from Codeium dashboard',
      },
    ],
    documentationUrl: 'https://codeium.com/docs/api',
    supportedFeatures: ['usage_tracking'],
  },
  tabnine: {
    provider: 'tabnine',
    name: 'Tabnine',
    description: 'AI code completion for teams',
    websiteUrl: 'https://www.tabnine.com',
    requiresOrgAccess: true,
    credentialFields: [
      {
        key: 'apiKey',
        label: 'Enterprise API Key',
        type: 'api_key',
        required: true,
        placeholder: 'tab_...',
        helpText: 'Enterprise API key from Tabnine admin portal',
      },
    ],
    documentationUrl: 'https://www.tabnine.com/docs/api',
    supportedFeatures: ['usage_tracking', 'team_analytics'],
  },
  claude_code: {
    provider: 'claude_code',
    name: 'Claude Code',
    description: 'Anthropic Claude for coding',
    websiteUrl: 'https://www.anthropic.com',
    requiresOrgAccess: false,
    credentialFields: [
      {
        key: 'apiKey',
        label: 'Anthropic API Key',
        type: 'api_key',
        required: true,
        placeholder: 'sk-ant-...',
        helpText: 'API key from Anthropic Console',
      },
    ],
    documentationUrl: 'https://docs.anthropic.com',
    supportedFeatures: ['usage_tracking', 'token_breakdown'],
  },
  openai_codex: {
    provider: 'openai_codex',
    name: 'OpenAI Codex',
    description: 'OpenAI GPT for code generation',
    websiteUrl: 'https://openai.com',
    requiresOrgAccess: true,
    credentialFields: [
      {
        key: 'apiKey',
        label: 'OpenAI API Key',
        type: 'api_key',
        required: true,
        placeholder: 'sk-...',
        helpText: 'Organization API key from OpenAI',
      },
      {
        key: 'organizationId',
        label: 'Organization ID',
        type: 'text',
        required: false,
        placeholder: 'org-...',
        helpText: 'Optional: your OpenAI organization ID',
      },
    ],
    documentationUrl: 'https://platform.openai.com/docs',
    supportedFeatures: ['usage_tracking', 'token_breakdown', 'cost_tracking'],
  },
  replit_ghostwriter: {
    provider: 'replit_ghostwriter',
    name: 'Replit Ghostwriter',
    description: 'AI pair programmer by Replit',
    websiteUrl: 'https://replit.com',
    requiresOrgAccess: true,
    credentialFields: [
      {
        key: 'apiKey',
        label: 'Replit API Key',
        type: 'api_key',
        required: true,
        placeholder: 'repl_...',
        helpText: 'Team API key from Replit',
      },
    ],
    supportedFeatures: ['usage_tracking'],
  },
  aws_codewhisperer: {
    provider: 'aws_codewhisperer',
    name: 'AWS CodeWhisperer',
    description: 'AI coding companion by AWS',
    websiteUrl: 'https://aws.amazon.com/codewhisperer',
    requiresOrgAccess: true,
    credentialFields: [
      {
        key: 'accessKeyId',
        label: 'AWS Access Key ID',
        type: 'text',
        required: true,
        placeholder: 'AKIA...',
        helpText: 'AWS access key with CodeWhisperer permissions',
      },
      {
        key: 'secretAccessKey',
        label: 'AWS Secret Access Key',
        type: 'password',
        required: true,
        placeholder: '...',
        helpText: 'AWS secret access key',
      },
      {
        key: 'region',
        label: 'AWS Region',
        type: 'text',
        required: true,
        placeholder: 'us-east-1',
        helpText: 'AWS region for CodeWhisperer',
      },
    ],
    documentationUrl: 'https://docs.aws.amazon.com/codewhisperer',
    supportedFeatures: ['usage_tracking'],
  },
};

/**
 * Helper type for creating new connections
 */
export type CreateAPIConnectionInput = Omit<APIConnection, 'id' | 'createdAt' | 'updatedAt' | 'lastSyncAt' | 'nextSyncAt'>;


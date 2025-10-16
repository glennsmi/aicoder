// import { Timestamp } from 'firebase/firestore' // Not needed - using `any` for timestamps

// Supported AI Provider types
export type AIProvider = 
  | 'cursor' 
  | 'github_copilot' 
  | 'openai_codex' 
  | 'anthropic_usage'
  | 'anthropic_code'
  | 'claude_code' 
  | 'gemini' 
  | 'codeium' 
  | 'tabnine'
  | 'replit_ghostwriter'
  | 'aws_codewhisperer'

export type ConnectionStatus = 'active' | 'failed' | 'paused' | 'testing'

export type SyncStatus = 'success' | 'failed' | 'partial' | 'in_progress'

// Encrypted credentials stored in Firestore
export interface EncryptedCredentials {
  encryptedData: string // AES-256-GCM encrypted JSON
  iv: string // Initialization vector
  authTag: string // Authentication tag
  encryptedAt: any // Timestamp - using any to avoid firebase-admin vs firebase type conflicts
}

// API Connection document
export interface APIConnection {
  id: string
  organizationId: string
  provider: AIProvider
  displayName: string
  credentials: EncryptedCredentials
  status: ConnectionStatus
  lastSyncAt?: any // Timestamp
  nextSyncAt?: any // Timestamp
  lastError?: string
  syncFrequency: 'daily' | 'hourly' | 'manual'
  createdBy: string
  createdAt: any // Timestamp
  updatedAt: any // Timestamp
}

// Sync history record
export interface SyncHistory {
  id: string
  connectionId: string
  organizationId: string
  provider: AIProvider
  startTime: any // Timestamp
  endTime?: any // Timestamp
  status: SyncStatus
  recordsSynced: number
  recordsFailed: number
  errors: string[]
  metadata?: {
    dateRange?: { start: string; end: string }
    totalCost?: number
    totalTokens?: number
    [key: string]: any
  }
}

// Standard usage data format
export interface UsageData {
  date: string // YYYY-MM-DD
  userId?: string
  userName?: string
  userEmail?: string
  model: string
  provider: AIProvider
  inputTokens: number
  outputTokens: number
  cachedTokens?: number
  totalTokens: number
  requests: number
  cost: number
  currency: string
  metadata?: {
    language?: string
    editor?: string
    suggestions?: number
    acceptances?: number
    [key: string]: any
  }
}

// Provider-specific credential schemas
export interface GitHubCopilotCredentials {
  type: 'pat' | 'github_app'
  token: string // Personal Access Token
  organization?: string
  enterprise?: string
}

export interface OpenAICredentials {
  apiKey: string
  organizationId?: string
}

export interface AnthropicUsageCredentials {
  apiKey: string
}

export interface AnthropicCodeCredentials {
  apiKey: string
}

export interface CursorCredentials {
  // CSV upload only for now
  method: 'csv'
}

export interface GeminiCredentials {
  apiKey: string
  projectId?: string
}

export interface CodeiumCredentials {
  apiKey: string
  enterpriseId?: string
}

// Union type for all credential types
export type ProviderCredentials =
  | GitHubCopilotCredentials
  | OpenAICredentials
  | AnthropicUsageCredentials
  | AnthropicCodeCredentials
  | CursorCredentials
  | GeminiCredentials
  | CodeiumCredentials

// Sync result from connector
export interface SyncResult {
  success: boolean
  recordsSynced: number
  recordsFailed: number
  errors: string[]
  metadata?: any
}

// Test connection result
export interface TestConnectionResult {
  success: boolean
  message: string
  metadata?: {
    organizationName?: string
    availableSeats?: number
    billingCycle?: string
    [key: string]: any
  }
}

// Cloud Function request/response types
export interface TestConnectionRequest {
  provider: AIProvider
  credentials: ProviderCredentials
}

export interface AddConnectionRequest {
  organizationId: string
  provider: AIProvider
  displayName: string
  credentials: ProviderCredentials
  syncFrequency?: 'daily' | 'hourly' | 'manual'
}

export interface SyncConnectionRequest {
  connectionId: string
  dateRange?: {
    start: string // YYYY-MM-DD
    end: string   // YYYY-MM-DD
  }
}

export interface AddConnectionResponse {
  connectionId: string
  status: ConnectionStatus
  message: string
}

// Pricing models
export interface ProviderPricing {
  provider: AIProvider
  models: {
    [modelName: string]: {
      inputTokenPrice: number  // per 1000 tokens
      outputTokenPrice: number // per 1000 tokens
      cachedTokenPrice?: number
      currency: string
    }
  }
  perSeatPricing?: {
    price: number
    currency: string
    billingCycle: 'monthly' | 'yearly'
  }
}


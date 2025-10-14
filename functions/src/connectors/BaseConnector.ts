import { AIProvider } from '../../../shared/src/types/apiConnector'

export interface ConnectorCredentials {
  apiKey: string
  organizationId?: string
  [key: string]: any
}

export interface UsageRecord {
  date: Date
  userId?: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
  requests: number
  metadata?: Record<string, any>
}

export interface SyncResult {
  success: boolean
  recordsProcessed: number
  recordsSaved: number
  errors: string[]
  lastSyncDate: Date
}

export interface TestConnectionResult {
  success: boolean
  message: string
  metadata?: Record<string, any>
}

export abstract class BaseConnector {
  protected provider: AIProvider
  protected credentials: ConnectorCredentials

  constructor(provider: AIProvider, credentials: ConnectorCredentials) {
    this.provider = provider
    this.credentials = credentials
  }

  /**
   * Test the API connection with the provided credentials
   */
  abstract testConnection(): Promise<TestConnectionResult>

  /**
   * Fetch usage data for a specific date range
   */
  abstract fetchUsage(startDate: Date, endDate: Date): Promise<UsageRecord[]>

  /**
   * Sync usage data and save to Firestore
   */
  abstract sync(organizationId: string, startDate: Date, endDate: Date): Promise<SyncResult>

  /**
   * Get the provider name
   */
  getProvider(): AIProvider {
    return this.provider
  }

  /**
   * Validate credentials format
   */
  protected validateCredentials(): void {
    if (!this.credentials.apiKey) {
      throw new Error('API key is required')
    }
  }
}


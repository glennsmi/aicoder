import { 
  UsageData, 
  SyncResult, 
  TestConnectionResult,
  ProviderCredentials,
  AIProvider
} from '../shared'

/**
 * Base abstract class for all AI provider connectors
 * Implements common functionality and defines interface
 */
export abstract class BaseConnector {
  protected provider: AIProvider
  protected credentials: ProviderCredentials

  constructor(provider: AIProvider, credentials: ProviderCredentials) {
    this.provider = provider
    this.credentials = credentials
  }

  /**
   * Test if the connection credentials are valid
   * @returns Promise with test result and metadata
   */
  abstract testConnection(): Promise<TestConnectionResult>

  /**
   * Fetch usage data for a date range
   * @param startDate YYYY-MM-DD format
   * @param endDate YYYY-MM-DD format
   * @returns Array of standardized usage data
   */
  abstract fetchUsage(startDate: string, endDate: string): Promise<UsageData[]>

  /**
   * Main sync method that orchestrates the data fetch and save
   * @param startDate YYYY-MM-DD format
   * @param endDate YYYY-MM-DD format
   * @param saveCallback Function to save data to Firestore
   * @returns Sync result with stats and errors
   */
  async sync(
    startDate: string,
    endDate: string,
    saveCallback: (data: UsageData[]) => Promise<void>
  ): Promise<SyncResult> {
    const errors: string[] = []
    let recordsSynced = 0
    let recordsFailed = 0

    try {
      // Test connection first
      const testResult = await this.testConnection()
      if (!testResult.success) {
        throw new Error(`Connection test failed: ${testResult.message}`)
      }

      // Fetch usage data
      const usageData = await this.fetchUsage(startDate, endDate)
      recordsSynced = usageData.length

      // Save to Firestore
      if (usageData.length > 0) {
        await saveCallback(usageData)
      }

      return {
        success: true,
        recordsSynced,
        recordsFailed,
        errors,
        metadata: {
          dateRange: { start: startDate, end: endDate },
          totalRecords: recordsSynced
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      errors.push(errorMessage)
      recordsFailed = 1

      return {
        success: false,
        recordsSynced,
        recordsFailed,
        errors,
        metadata: {
          dateRange: { start: startDate, end: endDate }
        }
      }
    }
  }

  /**
   * Helper: Calculate cost from tokens and pricing
   * @param inputTokens Number of input tokens
   * @param outputTokens Number of output tokens
   * @param cachedTokens Number of cached tokens (optional)
   * @param pricing Pricing per 1,000,000 tokens (industry standard)
   * @returns Total cost in USD
   */
  protected calculateTokenCost(
    inputTokens: number,
    outputTokens: number,
    cachedTokens: number = 0,
    pricing: {
      inputPrice: number  // per 1M tokens
      outputPrice: number // per 1M tokens
      cachedPrice?: number // per 1M tokens
    }
  ): number {
    const inputCost = (inputTokens / 1_000_000) * pricing.inputPrice
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPrice
    const cachedCost = cachedTokens > 0 && pricing.cachedPrice 
      ? (cachedTokens / 1_000_000) * pricing.cachedPrice 
      : 0

    return inputCost + outputCost + cachedCost
  }

  /**
   * Helper: Format date to YYYY-MM-DD
   */
  protected formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  /**
   * Helper: Parse date from YYYY-MM-DD
   */
  protected parseDate(dateString: string): Date {
    return new Date(dateString)
  }

  /**
   * Helper: Get date range for the last N days
   */
  protected getDateRange(days: number): { start: string; end: string } {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)

    return {
      start: this.formatDate(start),
      end: this.formatDate(end)
    }
  }
}

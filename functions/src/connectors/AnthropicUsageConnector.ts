import { BaseConnector } from './BaseConnector'
import {
  UsageData,
  TestConnectionResult,
  AnthropicUsageCredentials,
  AIProvider
} from '../shared'
import axios, { AxiosInstance } from 'axios'

/**
 * Anthropic Claude Usage & Cost API Connector
 * Docs: https://docs.claude.com/en/api/usage-cost-api
 * Priority: TOP (per user request)
 */
export class AnthropicUsageConnector extends BaseConnector {
  private api: AxiosInstance
  private creds: AnthropicUsageCredentials

  // Anthropic model pricing (per 1M tokens - industry standard)
  // Updated: October 2025 - Source: https://docs.anthropic.com/en/docs/about-claude/models
  private static readonly PRICING = {
    // Claude Opus 4.1 - Most powerful
    'claude-opus-4.1': { input: 15, output: 75 },
    'opus-4.1': { input: 15, output: 75 },
    
    // Claude Sonnet 4.5 - Intelligent, balanced for agents and coding
    'claude-sonnet-4.5': { input: 3, output: 15, cached: 0.30 }, // < 200K tokens
    'claude-sonnet-4.5-large': { input: 6, output: 22.50, cached: 0.60 }, // > 200K tokens
    'sonnet-4.5': { input: 3, output: 15, cached: 0.30 },
    
    // Claude Haiku 4.5 - Fastest, most cost-efficient
    'claude-haiku-4.5': { input: 1, output: 5, cached: 0.10 },
    'haiku-4.5': { input: 1, output: 5, cached: 0.10 },
    
    // Claude 3.5 Series (Previous generation)
    'claude-3-5-sonnet-20241022': { input: 3, output: 15, cached: 0.30 },
    'claude-3-5-sonnet-20240620': { input: 3, output: 15, cached: 0.30 },
    'claude-3-5-haiku-20241022': { input: 1, output: 5 },
    
    // Claude 3 Series (Legacy)
    'claude-3-opus-20240229': { input: 15, output: 75 },
    'claude-3-sonnet-20240229': { input: 3, output: 15 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    
    currency: 'USD'
  }

  constructor(credentials: AnthropicUsageCredentials) {
    super('anthropic_usage' as AIProvider, credentials)
    this.creds = credentials

    // Initialize axios instance with auth
    this.api = axios.create({
      baseURL: 'https://api.anthropic.com/v1',
      headers: {
        'x-api-key': this.creds.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    })
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      // Test by fetching recent usage
      const today = this.formatDate(new Date())
      const response = await this.api.get('/organization/usage', {
        params: {
          start_date: today,
          end_date: today
        }
      })

      return {
        success: true,
        message: 'Successfully connected to Anthropic Usage API',
        metadata: {
          organizationId: response.data.organization_id,
          billingPeriod: response.data.billing_period
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          message: `Anthropic API Error: ${error.response?.data?.error?.message || error.message}`
        }
      }
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  async fetchUsage(startDate: string, endDate: string): Promise<UsageData[]> {
    try {
      const usageData: UsageData[] = []

      // Fetch usage data from Anthropic API
      const response = await this.api.get('/organization/usage', {
        params: {
          start_date: startDate,
          end_date: endDate
        }
      })

      const usage = response.data

      if (usage && usage.data && Array.isArray(usage.data)) {
        for (const dayData of usage.data) {
          const date = dayData.date

          // Process each model's usage
          for (const modelUsage of dayData.models || []) {
            const model = modelUsage.model_name
            const pricing = this.getPricingForModel(model)

            const inputTokens = modelUsage.input_tokens || 0
            const outputTokens = modelUsage.output_tokens || 0
            const cachedTokens = modelUsage.cached_input_tokens || 0
            const totalTokens = inputTokens + outputTokens + cachedTokens
            const requests = modelUsage.requests || 0

            // Calculate cost (pricing already per 1M tokens)
            const cost = this.calculateTokenCost(
              inputTokens,
              outputTokens,
              cachedTokens,
              {
                inputPrice: pricing.input,
                outputPrice: pricing.output,
                cachedPrice: pricing.cached
              }
            )

            usageData.push({
              date,
              model,
              provider: 'anthropic_usage',
              inputTokens,
              outputTokens,
              cachedTokens,
              totalTokens,
              requests,
              cost,
              currency: AnthropicUsageConnector.PRICING.currency,
              metadata: {
                billingPeriod: usage.billing_period,
                organizationId: usage.organization_id
              }
            })
          }
        }
      }

      return usageData
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Anthropic API Error: ${error.response?.data?.error?.message || error.message}`)
      }
      throw error
    }
  }

  /**
   * Get pricing for a model, with fallback to default
   */
  private getPricingForModel(model: string): { input: number; output: number; cached?: number } {
    // Try exact match
    if (model in AnthropicUsageConnector.PRICING) {
      return AnthropicUsageConnector.PRICING[model as keyof typeof AnthropicUsageConnector.PRICING] as { input: number; output: number; cached?: number }
    }

    // Try prefix match
    for (const [key, value] of Object.entries(AnthropicUsageConnector.PRICING)) {
      if (model.startsWith(key.split('-')[0]) && typeof value === 'object' && 'input' in value) {
        return value as { input: number; output: number; cached?: number }
      }
    }

    // Default to Sonnet pricing
    console.warn(`Unknown model ${model}, using Claude 3.5 Sonnet pricing as fallback`)
    return AnthropicUsageConnector.PRICING['claude-3-5-sonnet-20241022']
  }
}


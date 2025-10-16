import { BaseConnector } from './BaseConnector'
import {
  UsageData,
  TestConnectionResult,
  AnthropicCodeCredentials,
  AIProvider
} from '../shared'
import axios, { AxiosInstance } from 'axios'

/**
 * Anthropic Claude Code Analytics API Connector
 * Docs: https://docs.claude.com/en/api/claude-code-analytics-api
 * Priority: TOP (per user request - more important for developers)
 */
export class AnthropicCodeConnector extends BaseConnector {
  private api: AxiosInstance
  private creds: AnthropicCodeCredentials

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

  constructor(credentials: AnthropicCodeCredentials) {
    super('anthropic_code' as AIProvider, credentials)
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
      // Test by fetching recent code analytics
      const today = this.formatDate(new Date())
      const response = await this.api.get('/organization/code-analytics', {
        params: {
          start_date: today,
          end_date: today
        }
      })

      return {
        success: true,
        message: 'Successfully connected to Anthropic Code Analytics API',
        metadata: {
          organizationId: response.data.organization_id,
          period: response.data.period
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

      // Fetch code analytics data from Anthropic API
      const response = await this.api.get('/organization/code-analytics', {
        params: {
          start_date: startDate,
          end_date: endDate,
          group_by: 'user' // Get per-user breakdown
        }
      })

      const analytics = response.data

      if (analytics && analytics.data && Array.isArray(analytics.data)) {
        for (const dayData of analytics.data) {
          const date = dayData.date

          // Process each user's usage
          for (const userUsage of dayData.users || []) {
            const userId = userUsage.user_id
            const userName = userUsage.user_name
            const userEmail = userUsage.user_email

            // Process each model used by this user
            for (const modelUsage of userUsage.models || []) {
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
                userId,
                userName,
                userEmail,
                model,
                provider: 'anthropic_code',
                inputTokens,
                outputTokens,
                cachedTokens,
                totalTokens,
                requests,
                cost,
                currency: AnthropicCodeConnector.PRICING.currency,
                metadata: {
                  language: modelUsage.language,
                  editor: modelUsage.editor,
                  suggestions: modelUsage.suggestions || 0,
                  acceptances: modelUsage.acceptances || 0,
                  acceptanceRate: modelUsage.suggestions > 0
                    ? ((modelUsage.acceptances / modelUsage.suggestions) * 100).toFixed(2)
                    : '0',
                  linesOfCode: modelUsage.lines_of_code || 0,
                  filesModified: modelUsage.files_modified || 0
                }
              })
            }
          }

          // Also create aggregate records for the organization
          if (dayData.aggregated) {
            for (const modelUsage of dayData.aggregated.models || []) {
              const model = modelUsage.model_name
              const pricing = this.getPricingForModel(model)

              const inputTokens = modelUsage.input_tokens || 0
              const outputTokens = modelUsage.output_tokens || 0
              const cachedTokens = modelUsage.cached_input_tokens || 0
              const totalTokens = inputTokens + outputTokens + cachedTokens
              const requests = modelUsage.requests || 0

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
                provider: 'anthropic_code',
                inputTokens,
                outputTokens,
                cachedTokens,
                totalTokens,
                requests,
                cost,
                currency: AnthropicCodeConnector.PRICING.currency,
                metadata: {
                  isAggregate: true,
                  totalUsers: dayData.users?.length || 0,
                  organizationId: analytics.organization_id
                }
              })
            }
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
    if (model in AnthropicCodeConnector.PRICING) {
      return AnthropicCodeConnector.PRICING[model as keyof typeof AnthropicCodeConnector.PRICING] as { input: number; output: number; cached?: number }
    }

    // Try prefix match
    for (const [key, value] of Object.entries(AnthropicCodeConnector.PRICING)) {
      if (model.startsWith(key.split('-')[0]) && typeof value === 'object' && 'input' in value) {
        return value as { input: number; output: number; cached?: number }
      }
    }

    // Default to Sonnet pricing
    console.warn(`Unknown model ${model}, using Claude 3.5 Sonnet pricing as fallback`)
    return AnthropicCodeConnector.PRICING['claude-3-5-sonnet-20241022']
  }
}


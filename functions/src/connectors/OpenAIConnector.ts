import { BaseConnector } from './BaseConnector'
import {
  UsageData,
  TestConnectionResult,
  OpenAICredentials,
  AIProvider
} from '../shared'
import axios, { AxiosInstance } from 'axios'

/**
 * OpenAI API Connector
 * Docs: https://platform.openai.com/docs/api-reference
 */
export class OpenAIConnector extends BaseConnector {
  private api: AxiosInstance
  private creds: OpenAICredentials

  // OpenAI model pricing (per 1M tokens - industry standard)
  // Updated: October 2025 - Source: https://platform.openai.com/docs/pricing
  private static readonly PRICING = {
    // GPT-5 Series (Latest)
    'gpt-5': { input: 1.25, output: 10.00, cached: 0.125 },
    'gpt-5-mini': { input: 0.25, output: 2.00, cached: 0.025 },
    'gpt-5-nano': { input: 0.05, output: 0.40, cached: 0.005 },
    'gpt-5-chat-latest': { input: 1.25, output: 10.00, cached: 0.125 },
    'gpt-5-codex': { input: 1.25, output: 10.00, cached: 0.125 },
    'gpt-5-pro': { input: 15.00, output: 120.00 },
    
    // GPT-4.1 Series
    'gpt-4.1': { input: 2.00, output: 8.00, cached: 0.50 },
    'gpt-4.1-mini': { input: 0.40, output: 1.60, cached: 0.10 },
    'gpt-4.1-nano': { input: 0.10, output: 0.40, cached: 0.025 },
    
    // GPT-4o Series
    'gpt-4o': { input: 2.50, output: 10.00, cached: 1.25 },
    'gpt-4o-2024-11-20': { input: 2.50, output: 10.00, cached: 1.25 },
    'gpt-4o-2024-08-06': { input: 2.50, output: 10.00, cached: 1.25 },
    'gpt-4o-2024-05-13': { input: 5.00, output: 15.00 },
    'gpt-4o-audio-preview': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60, cached: 0.075 },
    'gpt-4o-mini-2024-07-18': { input: 0.15, output: 0.60, cached: 0.075 },
    
    // GPT-4 Turbo Series
    'gpt-4-turbo': { input: 10, output: 30 },
    'gpt-4-turbo-2024-04-09': { input: 10, output: 30 },
    'gpt-4-turbo-preview': { input: 10, output: 30 },
    'gpt-4-0125-preview': { input: 10, output: 30 },
    'gpt-4-1106-preview': { input: 10, output: 30 },
    'gpt-4-vision-preview': { input: 10, output: 30 },
    
    // GPT-4 Series
    'gpt-4': { input: 30, output: 60 },
    'gpt-4-0613': { input: 30, output: 60 },
    'gpt-4-32k': { input: 60, output: 120 },
    'gpt-4-32k-0613': { input: 60, output: 120 },
    
    // GPT-3.5 Turbo Series
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
    'gpt-3.5-turbo-0125': { input: 0.50, output: 1.50 },
    'gpt-3.5-turbo-1106': { input: 1.00, output: 2.00 },
    'gpt-3.5-turbo-instruct': { input: 1.50, output: 2.00 },
    
    // Embeddings
    'text-embedding-3-large': { input: 0.13, output: 0 },
    'text-embedding-3-small': { input: 0.02, output: 0 },
    'text-embedding-ada-002': { input: 0.10, output: 0 },
    
    // Image Models (per image, not per token)
    'dall-e-3': { input: 40, output: 0 }, // HD: 80, Standard: 40
    'dall-e-2': { input: 20, output: 0 }, // 1024x1024
    
    // Audio Models
    'whisper-1': { input: 6, output: 0 }, // per minute
    'tts-1': { input: 15, output: 0 }, // per 1M characters
    'tts-1-hd': { input: 30, output: 0 }, // per 1M characters
    
    currency: 'USD'
  }

  constructor(credentials: OpenAICredentials) {
    super('openai_codex' as AIProvider, credentials)
    this.creds = credentials

    // Initialize axios instance with auth
    this.api = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${this.creds.apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (this.creds.organizationId) {
      this.api.defaults.headers['OpenAI-Organization'] = this.creds.organizationId
    }
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      // Test by listing models
      const response = await this.api.get('/models')

      return {
        success: true,
        message: 'Successfully connected to OpenAI API',
        metadata: {
          organizationId: this.creds.organizationId,
          modelsAvailable: response.data.data?.length || 0
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          message: `OpenAI API Error: ${error.response?.data?.error?.message || error.message}`
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

      // Parse dates
      const start = this.parseDate(startDate)
      const end = this.parseDate(endDate)

      // Fetch usage for each day in range
      const currentDate = new Date(start)
      while (currentDate <= end) {
        const dateStr = this.formatDate(currentDate)

        try {
          // OpenAI usage endpoint format: /usage?date=YYYY-MM-DD
          const response = await this.api.get('/usage', {
            params: { date: dateStr }
          })

          const dailyUsage = response.data

          if (dailyUsage && dailyUsage.data) {
            // Process each model's usage for the day
            for (const modelData of dailyUsage.data) {
              const model = modelData.model || modelData.snapshot_id
              const pricing = this.getPricingForModel(model)

              // Calculate cost
              const inputTokens = modelData.n_context_tokens_total || 0
              const outputTokens = modelData.n_generated_tokens_total || 0
              const totalTokens = inputTokens + outputTokens
              const requests = modelData.n_requests || 0

              const cost = this.calculateTokenCost(
                inputTokens,
                outputTokens,
                0,
                {
                  inputPrice: pricing.input,
                  outputPrice: pricing.output
                }
              )

              usageData.push({
                date: dateStr,
                model,
                provider: 'openai_codex',
                inputTokens,
                outputTokens,
                totalTokens,
                requests,
                cost,
                currency: OpenAIConnector.PRICING.currency,
                metadata: {
                  organizationId: this.creds.organizationId,
                  contextTokens: modelData.n_context_tokens_total,
                  generatedTokens: modelData.n_generated_tokens_total,
                  cachedTokens: modelData.n_cached_tokens_total || 0
                }
              })
            }
          }
        } catch (dayError) {
          // Skip days with no data or errors
          console.warn(`No usage data for ${dateStr}:`, dayError)
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1)
      }

      return usageData
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`OpenAI API Error: ${error.response?.data?.error?.message || error.message}`)
      }
      throw error
    }
  }

  /**
   * Get pricing for a model, with fallback to default
   */
  private getPricingForModel(model: string): { input: number; output: number } {
    // Try exact match
    if (model in OpenAIConnector.PRICING) {
      return OpenAIConnector.PRICING[model as keyof typeof OpenAIConnector.PRICING] as { input: number; output: number }
    }

    // Try prefix match
    for (const [key, value] of Object.entries(OpenAIConnector.PRICING)) {
      if (model.startsWith(key) && typeof value === 'object' && 'input' in value) {
        return value as { input: number; output: number }
      }
    }

    // Default to GPT-4 pricing
    console.warn(`Unknown model ${model}, using GPT-4 pricing as fallback`)
    return OpenAIConnector.PRICING['gpt-4']
  }
}


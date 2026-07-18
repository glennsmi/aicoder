import { BaseConnector } from './BaseConnector'
import {
  UsageData,
  TestConnectionResult,
  OpenAICredentials,
  AIProvider
} from '../shared'
import axios, { AxiosInstance } from 'axios'

/**
 * OpenAI Admin Usage API Connector(s)
 * Docs: https://platform.openai.com/docs/api-reference
 */
class OpenAIUsageConnectorBase extends BaseConnector {
  private api: AxiosInstance
  private creds: OpenAICredentials
  private groupBy: Array<
    'project_id' | 'user_id' | 'api_key_id' | 'model' | 'batch' | 'service_tier'
  >

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

  constructor(
    provider: AIProvider,
    credentials: OpenAICredentials,
    groupBy: OpenAIUsageConnectorBase['groupBy']
  ) {
    super(provider, credentials)
    this.creds = credentials
    this.groupBy = groupBy

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

      const { startTimeSec, endTimeExclusiveSec } = this.toUnixRange(startDate, endDate)

      // Paginated, time-bucketed usage
      let page: string | undefined = undefined
      let hasMore = true

      while (hasMore) {
        const params = new URLSearchParams()
        params.set('start_time', String(startTimeSec))
        params.set('end_time', String(endTimeExclusiveSec))
        params.set('bucket_width', '1d')
        for (const g of this.groupBy) params.append('group_by', g)
        if (page) params.set('page', page)

        const response = await this.api.get('/organization/usage/completions', { params })
        const payload = response.data as {
          object: 'page'
          data: Array<{
            object: 'bucket'
            start_time: number
            end_time: number
            results: Array<{
              object: 'organization.usage.completions.result'
              input_tokens: number
              output_tokens: number
              input_cached_tokens?: number
              input_audio_tokens?: number
              output_audio_tokens?: number
              num_model_requests: number
              project_id?: string | null
              user_id?: string | null
              api_key_id?: string | null
              model?: string | null
              batch?: boolean | null
              service_tier?: string | null
            }>
          }>
          has_more: boolean
          next_page: string | null
        }

        for (const bucket of payload.data || []) {
          const date = new Date(bucket.start_time * 1000).toISOString().slice(0, 10)

          for (const r of bucket.results || []) {
            const model = r.model || 'all-models'
            const pricing = this.getPricingForModel(model)

            const inputTokensIncludingCached = r.input_tokens || 0
            const cachedTokens = r.input_cached_tokens || 0
            const uncachedInputTokens = Math.max(0, inputTokensIncludingCached - cachedTokens)
            const outputTokens = r.output_tokens || 0
            const totalTokens = uncachedInputTokens + cachedTokens + outputTokens

            const cost = this.calculateTokenCost(
              uncachedInputTokens,
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
              userId: r.user_id || undefined,
              model,
              provider: this.provider,
              inputTokens: uncachedInputTokens,
              outputTokens,
              cachedTokens,
              totalTokens,
              requests: r.num_model_requests || 0,
              cost,
              currency: OpenAIUsageConnectorBase.PRICING.currency,
              metadata: {
                organizationId: this.creds.organizationId,
                openaiProjectId: r.project_id ?? undefined,
                openaiApiKeyId: r.api_key_id ?? undefined,
                serviceTier: r.service_tier ?? undefined,
                batch: r.batch ?? undefined,
                // OpenAI reports input_tokens INCLUDING cached tokens; we split it for consistency.
                openaiInputTokensIncludingCached: inputTokensIncludingCached,
                inputAudioTokens: r.input_audio_tokens || 0,
                outputAudioTokens: r.output_audio_tokens || 0
              }
            })
          }
        }

        hasMore = !!payload.has_more
        page = payload.next_page || undefined
      }

      return usageData
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`OpenAI API Error: ${error.response?.data?.error?.message || error.message}`)
      }
      throw error
    }
  }

  private toUnixRange(startDate: string, endDate: string): {
    startTimeSec: number
    endTimeExclusiveSec: number
  } {
    // Treat YYYY-MM-DD as UTC midnight boundaries.
    const start = new Date(`${startDate}T00:00:00.000Z`)
    const endInclusive = new Date(`${endDate}T00:00:00.000Z`)
    const endExclusive = new Date(endInclusive)
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)

    return {
      startTimeSec: Math.floor(start.getTime() / 1000),
      endTimeExclusiveSec: Math.floor(endExclusive.getTime() / 1000)
    }
  }

  /**
   * Get pricing for a model, with fallback to default
   */
  private getPricingForModel(model: string): { input: number; output: number; cached?: number } {
    // Try exact match
    if (model in OpenAIUsageConnectorBase.PRICING) {
      return OpenAIUsageConnectorBase.PRICING[model as keyof typeof OpenAIUsageConnectorBase.PRICING] as { input: number; output: number; cached?: number }
    }

    // Try prefix match
    for (const [key, value] of Object.entries(OpenAIUsageConnectorBase.PRICING)) {
      if (model.startsWith(key) && typeof value === 'object' && 'input' in value) {
        return value as { input: number; output: number; cached?: number }
      }
    }

    // Default to GPT-4 pricing
    console.warn(`Unknown model ${model}, using GPT-4 pricing as fallback`)
    return OpenAIUsageConnectorBase.PRICING['gpt-4']
  }
}

/**
 * Personal admin-key connector.
 *
 * Note: OpenAI’s reporting endpoints are organization-scoped; a “personal” account is usually
 * a 1-person org. This connector pulls daily usage grouped by model only.
 */
export class OpenAIPersonalAdminConnector extends OpenAIUsageConnectorBase {
  constructor(credentials: OpenAICredentials) {
    super('openai_admin_personal' as AIProvider, credentials, ['model'])
  }
}

/**
 * Organization admin-key connector (multi-user).
 *
 * Pulls daily usage grouped by OpenAI user_id + api_key_id + model so we can attribute usage.
 * Note: userId here is OpenAI’s user_id (external identifier).
 */
export class OpenAIOrgAdminConnector extends OpenAIUsageConnectorBase {
  constructor(credentials: OpenAICredentials) {
    super('openai_admin_org' as AIProvider, credentials, ['user_id', 'api_key_id', 'model'])
  }
}

/**
 * Backward-compatible provider id (legacy).
 * Keep for any existing connections using `openai_codex`.
 */
export class OpenAIConnector extends OpenAIUsageConnectorBase {
  constructor(credentials: OpenAICredentials) {
    super('openai_codex' as AIProvider, credentials, ['user_id', 'api_key_id', 'model'])
  }
}


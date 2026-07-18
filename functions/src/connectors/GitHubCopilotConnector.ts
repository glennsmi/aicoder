import { BaseConnector } from './BaseConnector'
import {
  UsageData,
  TestConnectionResult,
  GitHubCopilotCredentials,
  AIProvider
} from '../shared'
import axios, { AxiosInstance } from 'axios'

/**
 * GitHub Copilot API Connector
 * Docs: https://docs.github.com/en/rest/copilot
 */
export class GitHubCopilotConnector extends BaseConnector {
  private api: AxiosInstance
  private creds: GitHubCopilotCredentials

  // Copilot pricing (as of 2025)
  private static readonly PRICING = {
    individual: 10, // $10/month per user
    business: 19,   // $19/month per user
    currency: 'USD'
  }

  constructor(credentials: GitHubCopilotCredentials) {
    super('github_copilot' as AIProvider, credentials)
    this.creds = credentials

    // Initialize axios instance with auth
    this.api = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        'Authorization': `Bearer ${this.creds.token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      // Test by fetching seat information
      const endpoint = this.creds.enterprise
        ? `/enterprises/${this.creds.enterprise}/copilot/billing`
        : `/orgs/${this.creds.organization}/copilot/billing`

      const response = await this.api.get(endpoint)

      return {
        success: true,
        message: 'Successfully connected to GitHub Copilot API',
        metadata: {
          organizationName: this.creds.organization || this.creds.enterprise,
          totalSeats: response.data.seat_breakdown?.total || 0,
          activeSeats: response.data.seat_breakdown?.active_this_cycle || 0,
          plan: this.creds.enterprise ? 'enterprise' : 'business'
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          message: `GitHub API Error: ${error.response?.data?.message || error.message}`
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

      // Determine endpoint based on org/enterprise
      const baseEndpoint = this.creds.enterprise
        ? `/enterprises/${this.creds.enterprise}/copilot`
        : `/orgs/${this.creds.organization}/copilot`

      // Fetch usage metrics
      const usageResponse = await this.api.get(`${baseEndpoint}/usage`, {
        params: {
          since: startDate,
          until: endDate,
          per_page: 100
        }
      })

      // Fetch seat information for cost calculation
      const billingResponse = await this.api.get(`${baseEndpoint}/billing`)
      const activeSeats = billingResponse.data.seat_breakdown?.active_this_cycle || 0

      // GitHub Copilot usage data structure
      const usage = usageResponse.data

      if (usage && Array.isArray(usage)) {
        for (const dayData of usage) {
          const date = dayData.day
          const breakdown = dayData.breakdown || []

          // Calculate daily cost (pro-rated monthly cost)
          const dailyCost = (activeSeats * GitHubCopilotConnector.PRICING.business) / 30

          // Aggregate data for the day
          const totalSuggestions = breakdown.reduce((sum: number, item: any) => 
            sum + (item.suggestions_count || 0), 0)
          const totalAcceptances = breakdown.reduce((sum: number, item: any) => 
            sum + (item.acceptances_count || 0), 0)
          const totalActiveUsers = breakdown.reduce((sum: number, item: any) => 
            sum + (item.active_users?.length || 0), 0)

          // Create usage record for the day
          usageData.push({
            date,
            model: 'github-copilot',
            provider: 'github_copilot',
            inputTokens: 0, // GitHub doesn't provide token counts
            outputTokens: 0,
            totalTokens: 0,
            requests: totalSuggestions,
            cost: dailyCost,
            currency: GitHubCopilotConnector.PRICING.currency,
            metadata: {
              suggestions: totalSuggestions,
              acceptances: totalAcceptances,
              activeUsers: totalActiveUsers,
              acceptanceRate: totalSuggestions > 0 
                ? (totalAcceptances / totalSuggestions * 100).toFixed(2) 
                : '0',
              activeSeats
            }
          })

          // Also create per-user records if available
          for (const item of breakdown) {
            if (item.active_users && Array.isArray(item.active_users)) {
              for (const user of item.active_users) {
                usageData.push({
                  date,
                  userId: user.login,
                  userName: user.login,
                  model: 'github-copilot',
                  provider: 'github_copilot',
                  inputTokens: 0,
                  outputTokens: 0,
                  totalTokens: 0,
                  requests: 0, // Per-user suggestions not provided
                  cost: GitHubCopilotConnector.PRICING.business / 30, // Daily pro-rated cost per user
                  currency: GitHubCopilotConnector.PRICING.currency,
                  metadata: {
                    language: item.language,
                    editor: item.editor
                  }
                })
              }
            }
          }
        }
      }

      return usageData
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`GitHub API Error: ${error.response?.data?.message || error.message}`)
      }
      throw error
    }
  }
}

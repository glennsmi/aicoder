import { BaseConnector, UsageRecord, SyncResult, TestConnectionResult, ConnectorCredentials } from './BaseConnector'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

/**
 * GitHub Copilot API Connector
 * 
 * Uses GitHub Enterprise API to fetch Copilot usage data
 * API Documentation: https://docs.github.com/en/rest/copilot/copilot-usage
 */
export class GitHubCopilotConnector extends BaseConnector {
  private apiEndpoint = 'https://api.github.com'

  constructor(credentials: ConnectorCredentials) {
    super('github_copilot', credentials)
  }

  async testConnection(): Promise<TestConnectionResult> {
    this.validateCredentials()

    if (!this.credentials.organizationId) {
      return {
        success: false,
        message: 'GitHub organization ID is required',
      }
    }

    try {
      const response = await fetch(`${this.apiEndpoint}/orgs/${this.credentials.organizationId}`, {
        headers: {
          'Authorization': `Bearer ${this.credentials.apiKey}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        return {
          success: false,
          message: `GitHub API error: ${error.message || response.statusText}`,
        }
      }

      const orgData = await response.json()

      return {
        success: true,
        message: 'Connection successful',
        metadata: {
          organization: orgData.login,
          name: orgData.name,
        },
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Connection failed',
      }
    }
  }

  async fetchUsage(startDate: Date, endDate: Date): Promise<UsageRecord[]> {
    this.validateCredentials()

    if (!this.credentials.organizationId) {
      throw new Error('GitHub organization ID is required')
    }

    try {
      // Fetch Copilot usage for the organization
      // Note: GitHub's API returns usage aggregated by day and by user
      const response = await fetch(
        `${this.apiEndpoint}/orgs/${this.credentials.organizationId}/copilot/usage`,
        {
          headers: {
            'Authorization': `Bearer ${this.credentials.apiKey}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`GitHub API error: ${error.message || response.statusText}`)
      }

      const data = await response.json()
      return this.transformGitHubData(data, startDate, endDate)
    } catch (error: any) {
      console.error('Error fetching GitHub Copilot usage:', error)
      throw new Error(`Failed to fetch GitHub Copilot usage: ${error.message}`)
    }
  }

  async sync(organizationId: string, startDate: Date, endDate: Date): Promise<SyncResult> {
    const db = getFirestore()
    const errors: string[] = []
    let recordsProcessed = 0
    let recordsSaved = 0

    try {
      const usageRecords = await this.fetchUsage(startDate, endDate)
      recordsProcessed = usageRecords.length

      // Save each record to Firestore
      for (const record of usageRecords) {
        try {
          // Find or create user based on GitHub username
          const userId = record.userId || 'unknown'

          // Save to user's usage collection
          const usageRef = db
            .collection('users')
            .doc(userId)
            .collection('enhanced_cursor_usage')
            .doc()

          await usageRef.set({
            date: Timestamp.fromDate(record.date),
            model: record.model || 'github-copilot',
            inputTokens: record.inputTokens,
            outputTokens: record.outputTokens,
            totalTokens: record.totalTokens,
            cost: record.cost,
            requests: record.requests,
            source: 'github_copilot_api',
            syncedAt: Timestamp.now(),
            metadata: record.metadata || {},
          })

          recordsSaved++
        } catch (error: any) {
          errors.push(`Failed to save record for user ${record.userId}: ${error.message}`)
        }
      }

      // Update the API connection's last sync timestamp
      await db
        .collection('organizations')
        .doc(organizationId)
        .collection('apiConnections')
        .where('provider', '==', 'github_copilot')
        .limit(1)
        .get()
        .then(async (snapshot) => {
          if (!snapshot.empty) {
            const connectionDoc = snapshot.docs[0]
            await connectionDoc.ref.update({
              lastSync: Timestamp.now(),
              lastSyncStatus: errors.length > 0 ? 'partial' : 'success',
              recordCount: recordsSaved,
            })
          }
        })

      return {
        success: errors.length === 0,
        recordsProcessed,
        recordsSaved,
        errors,
        lastSyncDate: new Date(),
      }
    } catch (error: any) {
      console.error('Error syncing GitHub Copilot data:', error)
      return {
        success: false,
        recordsProcessed,
        recordsSaved,
        errors: [...errors, error.message],
        lastSyncDate: new Date(),
      }
    }
  }

  /**
   * Transform GitHub Copilot API response to our standard format
   * 
   * GitHub's response structure (example):
   * [
   *   {
   *     "day": "2024-01-01",
   *     "total_suggestions_count": 100,
   *     "total_acceptances_count": 50,
   *     "total_lines_suggested": 500,
   *     "total_lines_accepted": 250,
   *     "total_active_users": 10,
   *     "breakdown": [
   *       {
   *         "language": "python",
   *         "editor": "vscode",
   *         "suggestions_count": 50,
   *         "acceptances_count": 25
   *       }
   *     ]
   *   }
   * ]
   */
  private transformGitHubData(data: any, startDate: Date, endDate: Date): UsageRecord[] {
    const records: UsageRecord[] = []

    if (!Array.isArray(data)) {
      return records
    }

    for (const dayData of data) {
      const recordDate = new Date(dayData.day)
      
      // Filter by date range
      if (recordDate < startDate || recordDate > endDate) {
        continue
      }

      // GitHub doesn't provide detailed token counts, so we'll estimate based on suggestions
      // Average tokens per suggestion: ~50 (rough estimate)
      const estimatedTokens = dayData.total_suggestions_count * 50
      
      // Copilot pricing is typically $10/user/month or $19/user/month for business
      // Estimate daily cost per user
      const costPerUser = 10 / 30 // ~$0.33 per user per day
      const estimatedCost = dayData.total_active_users * costPerUser

      records.push({
        date: recordDate,
        model: 'github-copilot',
        inputTokens: Math.floor(estimatedTokens * 0.3), // Estimate 30% input
        outputTokens: Math.floor(estimatedTokens * 0.7), // Estimate 70% output
        totalTokens: estimatedTokens,
        cost: estimatedCost,
        requests: dayData.total_suggestions_count,
        metadata: {
          acceptances: dayData.total_acceptances_count,
          lines_suggested: dayData.total_lines_suggested,
          lines_accepted: dayData.total_lines_accepted,
          active_users: dayData.total_active_users,
          breakdown: dayData.breakdown,
        },
      })
    }

    return records
  }
}


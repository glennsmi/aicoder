import { BaseConnector, UsageRecord, SyncResult, TestConnectionResult, ConnectorCredentials } from './BaseConnector'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

/**
 * Cursor API Connector
 * 
 * Note: Cursor's API is still being documented. This is a placeholder implementation
 * that will need to be updated when the official API is released.
 * 
 * Current approach: Manual CSV upload (existing functionality)
 * Future: Direct API integration when available
 */
export class CursorConnector extends BaseConnector {
  // Note: Cursor API endpoint is still in development
  // private apiEndpoint = 'https://api.cursor.sh/v1' // Placeholder endpoint

  constructor(credentials: ConnectorCredentials) {
    super('cursor', credentials)
  }

  async testConnection(): Promise<TestConnectionResult> {
    this.validateCredentials()

    try {
      // TODO: Replace with actual Cursor API call when available
      // For now, we'll just validate the API key format
      
      if (this.credentials.apiKey.length < 20) {
        return {
          success: false,
          message: 'Invalid API key format',
        }
      }

      // Simulate API call
      // const response = await fetch(`${this.apiEndpoint}/usage`, {
      //   headers: {
      //     'Authorization': `Bearer ${this.credentials.apiKey}`,
      //   },
      // })

      return {
        success: true,
        message: 'Connection successful',
        metadata: {
          note: 'Cursor API integration is pending official API release',
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

    try {
      // TODO: Replace with actual Cursor API call
      // const response = await fetch(`${this.apiEndpoint}/usage?start=${startDate.toISOString()}&end=${endDate.toISOString()}`, {
      //   headers: {
      //     'Authorization': `Bearer ${this.credentials.apiKey}`,
      //   },
      // })
      // const data = await response.json()
      // return this.transformCursorData(data)

      // Placeholder: Return empty array until API is available
      console.log(`Cursor API: Fetching usage from ${startDate} to ${endDate}`)
      return []
    } catch (error: any) {
      console.error('Error fetching Cursor usage:', error)
      throw new Error(`Failed to fetch Cursor usage: ${error.message}`)
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
          // Determine the target user (from metadata or organization default)
          const userId = record.userId || 'unknown'

          // Save to user's usage collection
          const usageRef = db
            .collection('users')
            .doc(userId)
            .collection('enhanced_cursor_usage')
            .doc()

          await usageRef.set({
            date: Timestamp.fromDate(record.date),
            model: record.model,
            inputTokens: record.inputTokens,
            outputTokens: record.outputTokens,
            totalTokens: record.totalTokens,
            cost: record.cost,
            requests: record.requests,
            source: 'cursor_api',
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
        .where('provider', '==', 'cursor')
        .limit(1)
        .get()
        .then(async (snapshot) => {
          if (!snapshot.empty) {
            const connectionDoc = snapshot.docs[0]
            await connectionDoc.ref.update({
              lastSync: Timestamp.now(),
              lastSyncStatus: errors.length > 0 ? 'partial' : 'success',
              recordCount: Timestamp.fromDate(new Date()),
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
      console.error('Error syncing Cursor data:', error)
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
   * Transform Cursor API response to our standard format
   * TODO: Implement transformation when Cursor API is available
   */
  // private transformCursorData(data: any): UsageRecord[] {
  //   return []
  // }
}


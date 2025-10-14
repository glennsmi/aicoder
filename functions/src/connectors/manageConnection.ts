import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { APIConnection, AIProvider } from '../../../shared/src/types/apiConnector'
import { CursorConnector } from './CursorConnector'
import { GitHubCopilotConnector } from './GitHubCopilotConnector'
import { BaseConnector } from './BaseConnector'

/**
 * Factory function to create the appropriate connector
 */
function createConnector(provider: AIProvider, credentials: any): BaseConnector {
  switch (provider) {
    case 'cursor':
      return new CursorConnector(credentials)
    case 'github_copilot':
      return new GitHubCopilotConnector(credentials)
    // Add more connectors as they are implemented
    // case 'codeium':
    //   return new CodeiumConnector(credentials)
    // case 'anthropic':
    //   return new AnthropicConnector(credentials)
    // case 'openai':
    //   return new OpenAIConnector(credentials)
    // case 'tabnine':
    //   return new TabnineConnector(credentials)
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

/**
 * Test an API connection
 */
export const testApiConnection = onCall(
  { region: 'europe-west2' },
  async (request) => {
    const { auth, data } = request

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated')
    }

    const { provider, credentials } = data

    if (!provider || !credentials) {
      throw new HttpsError('invalid-argument', 'Provider and credentials are required')
    }

    try {
      const connector = createConnector(provider, credentials)
      const result = await connector.testConnection()
      
      return result
    } catch (error: any) {
      console.error('Error testing connection:', error)
      throw new HttpsError('internal', error.message || 'Failed to test connection')
    }
  }
)

/**
 * Add a new API connection
 */
export const addApiConnection = onCall(
  { region: 'europe-west2' },
  async (request) => {
    const db = getFirestore()
    const { auth, data } = request

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated')
    }

    const { organizationId, provider, credentials, syncFrequency } = data

    if (!organizationId || !provider || !credentials) {
      throw new HttpsError('invalid-argument', 'Organization ID, provider, and credentials are required')
    }

    try {
      // Verify user has permission
      const memberDoc = await db
        .collection('organizations')
        .doc(organizationId)
        .collection('members')
        .doc(auth.uid)
        .get()

      if (!memberDoc.exists) {
        throw new HttpsError('permission-denied', 'User is not a member of this organization')
      }

      const memberData = memberDoc.data()
      if (memberData?.role !== 'admin') {
        throw new HttpsError('permission-denied', 'Only admins can manage API connections')
      }

      // Test the connection first
      const connector = createConnector(provider, credentials)
      const testResult = await connector.testConnection()

      if (!testResult.success) {
        throw new HttpsError('invalid-argument', `Connection test failed: ${testResult.message}`)
      }

      // Create the connection document
      const connectionRef = db
        .collection('organizations')
        .doc(organizationId)
        .collection('apiConnections')
        .doc()

      const connection: any = {
        id: connectionRef.id,
        organizationId,
        provider,
        name: `${provider} connection`,
        credentials, // TODO: Encrypt credentials before storing
        status: 'active',
        syncFrequency: syncFrequency || 'daily',
        addedBy: auth.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await connectionRef.set(connection)

      return {
        success: true,
        connectionId: connectionRef.id,
        message: 'API connection added successfully',
      }
    } catch (error: any) {
      console.error('Error adding API connection:', error)
      throw new HttpsError('internal', error.message || 'Failed to add API connection')
    }
  }
)

/**
 * Manually trigger a sync for an API connection
 */
export const syncApiConnection = onCall(
  { region: 'europe-west2' },
  async (request) => {
    const db = getFirestore()
    const { auth, data } = request

    if (!auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated')
    }

    const { organizationId, connectionId, startDate, endDate } = data

    if (!organizationId || !connectionId) {
      throw new HttpsError('invalid-argument', 'Organization ID and connection ID are required')
    }

    try {
      // Verify user has permission
      const memberDoc = await db
        .collection('organizations')
        .doc(organizationId)
        .collection('members')
        .doc(auth.uid)
        .get()

      if (!memberDoc.exists) {
        throw new HttpsError('permission-denied', 'User is not a member of this organization')
      }

      // Get the connection
      const connectionDoc = await db
        .collection('organizations')
        .doc(organizationId)
        .collection('apiConnections')
        .doc(connectionId)
        .get()

      if (!connectionDoc.exists) {
        throw new HttpsError('not-found', 'API connection not found')
      }

      const connectionData = connectionDoc.data() as APIConnection

      // Create connector and sync
      const connector = createConnector(connectionData.provider, connectionData.credentials)
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Default: last 7 days
      const end = endDate ? new Date(endDate) : new Date()

      const syncResult = await connector.sync(organizationId, start, end)

      // Update connection status
      await connectionDoc.ref.update({
        lastSyncAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })

      return {
        success: syncResult.success,
        recordsProcessed: syncResult.recordsProcessed,
        recordsSaved: syncResult.recordsSaved,
        errors: syncResult.errors,
        message: syncResult.success 
          ? `Successfully synced ${syncResult.recordsSaved} records`
          : `Sync completed with errors. Saved ${syncResult.recordsSaved} of ${syncResult.recordsProcessed} records`,
      }
    } catch (error: any) {
      console.error('Error syncing API connection:', error)
      throw new HttpsError('internal', error.message || 'Failed to sync API connection')
    }
  }
)


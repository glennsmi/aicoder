import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import {
  TestConnectionRequest,
  TestConnectionResult,
  AddConnectionRequest,
  AddConnectionResponse,
  SyncConnectionRequest,
  APIConnection,
  SyncHistory,
  UsageData
} from '../shared'
import { ConnectorFactory } from '../connectors/ConnectorFactory'
import { CredentialEncryption } from '../utils/encryption'
import { checkPermission, Permission } from '../utils/permissions'

const db = admin.firestore()

/**
 * Test API Connection
 * Validates credentials without saving them
 */
export const testApiConnection = functions.https.onCall(
  async (data: TestConnectionRequest, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const { provider, credentials } = data

    if (!provider || !credentials) {
      throw new functions.https.HttpsError('invalid-argument', 'Provider and credentials are required')
    }

    try {
      // Create connector instance
      const connector = ConnectorFactory.createConnector(provider, credentials)

      // Test connection
      const result = await connector.testConnection()

      return result
    } catch (error) {
      console.error('Test connection error:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error)
      } as TestConnectionResult
    }
  }
)

/**
 * Add API Connection
 * Encrypts and saves credentials, schedules first sync
 */
export const addApiConnection = functions.https.onCall(
  async (data: AddConnectionRequest, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const userId = context.auth.uid
    const { organizationId, provider, displayName, credentials, syncFrequency = 'daily' } = data

    if (!organizationId || !provider || !displayName || !credentials) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Organization ID, provider, display name, and credentials are required'
      )
    }

    try {
      // Check if user has permission to manage API connections
      const hasPermission = await checkPermission(userId, organizationId, Permission.MANAGE_BILLING)
      if (!hasPermission) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'User does not have permission to manage API connections'
        )
      }

      // Test connection first
      const connector = ConnectorFactory.createConnector(provider, credentials)
      const testResult = await connector.testConnection()

      if (!testResult.success) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Connection test failed: ${testResult.message}`
        )
      }

      // Encrypt credentials
      const encryptedCredentials = CredentialEncryption.encryptCredentials(credentials)

      // Calculate next sync time
      const now = admin.firestore.Timestamp.now()
      const nextSyncDate = new Date()
      if (syncFrequency === 'hourly') {
        nextSyncDate.setHours(nextSyncDate.getHours() + 1)
      } else {
        nextSyncDate.setDate(nextSyncDate.getDate() + 1)
        nextSyncDate.setHours(2, 0, 0, 0) // 2 AM UTC
      }
      const nextSyncAt = admin.firestore.Timestamp.fromDate(nextSyncDate)

      // Create connection document
      const connectionRef = db.collection('apiConnections').doc()
      const connection: Omit<APIConnection, 'id'> = {
        organizationId,
        provider,
        displayName,
        credentials: encryptedCredentials,
        status: 'active',
        syncFrequency,
        nextSyncAt,
        createdBy: userId,
        createdAt: now,
        updatedAt: now
      }

      await connectionRef.set(connection)

      return {
        connectionId: connectionRef.id,
        status: 'active',
        message: 'Connection added successfully'
      } as AddConnectionResponse
    } catch (error) {
      console.error('Add connection error:', error)
      
      if (error instanceof functions.https.HttpsError) {
        throw error
      }
      
      throw new functions.https.HttpsError(
        'internal',
        error instanceof Error ? error.message : String(error)
      )
    }
  }
)

/**
 * Sync API Connection
 * Manually trigger a sync for a connection
 */
export const syncApiConnection = functions.https.onCall(
  async (data: SyncConnectionRequest, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const userId = context.auth.uid
    const { connectionId, dateRange } = data

    if (!connectionId) {
      throw new functions.https.HttpsError('invalid-argument', 'Connection ID is required')
    }

    try {
      // Get connection document
      const connectionDoc = await db.collection('apiConnections').doc(connectionId).get()

      if (!connectionDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Connection not found')
      }

      const connection = { id: connectionDoc.id, ...connectionDoc.data() } as APIConnection

      // Check permission
      const hasPermission = await checkPermission(userId, connection.organizationId, Permission.MANAGE_BILLING)
      if (!hasPermission) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'User does not have permission to sync this connection'
        )
      }

      // Decrypt credentials
      const credentials = CredentialEncryption.decryptCredentials(connection.credentials)

      // Create connector
      const connector = ConnectorFactory.createConnector(connection.provider, credentials)

      // Determine date range
      const endDate = dateRange?.end || new Date().toISOString().split('T')[0]
      const startDate = dateRange?.start || (() => {
        const d = new Date()
        d.setDate(d.getDate() - 7) // Default to last 7 days
        return d.toISOString().split('T')[0]
      })()

      // Create sync history record
      const syncRef = db.collection('syncHistory').doc()
      const syncHistory: Omit<SyncHistory, 'id'> = {
        connectionId,
        organizationId: connection.organizationId,
        provider: connection.provider,
        startTime: admin.firestore.Timestamp.now(),
        status: 'in_progress',
        recordsSynced: 0,
        recordsFailed: 0,
        errors: []
      }
      await syncRef.set(syncHistory)

      // Perform sync
      const syncResult = await connector.sync(
        startDate,
        endDate,
        async (usageData: UsageData[]) => {
          // Save usage data to Firestore
          const batch = db.batch()
          
          for (const data of usageData) {
            const usageRef = db.collection('usage').doc()
            batch.set(usageRef, {
              ...data,
              organizationId: connection.organizationId,
              connectionId,
              syncId: syncRef.id,
              createdAt: admin.firestore.Timestamp.now()
            })
          }

          await batch.commit()
        }
      )

      // Update sync history
      await syncRef.update({
        endTime: admin.firestore.Timestamp.now(),
        status: syncResult.success ? 'success' : 'failed',
        recordsSynced: syncResult.recordsSynced,
        recordsFailed: syncResult.recordsFailed,
        errors: syncResult.errors,
        metadata: syncResult.metadata
      })

      // Update connection with last sync time
      await connectionDoc.ref.update({
        lastSyncAt: admin.firestore.Timestamp.now(),
        status: syncResult.success ? 'active' : 'failed',
        lastError: syncResult.success ? admin.firestore.FieldValue.delete() : syncResult.errors[0],
        updatedAt: admin.firestore.Timestamp.now()
      })

      return syncResult
    } catch (error) {
      console.error('Sync connection error:', error)
      
      if (error instanceof functions.https.HttpsError) {
        throw error
      }
      
      throw new functions.https.HttpsError(
        'internal',
        error instanceof Error ? error.message : String(error)
      )
    }
  }
)

/**
 * Scheduled API Sync
 * Runs daily at 2 AM UTC to sync all active connections
 */
export const scheduledApiSync = functions.pubsub
  .schedule('0 2 * * *') // Daily at 2 AM UTC
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('Starting scheduled API sync')

    try {
      // Get all active connections that need syncing
      const now = admin.firestore.Timestamp.now()
      const connectionsSnapshot = await db
        .collection('apiConnections')
        .where('status', '==', 'active')
        .where('nextSyncAt', '<=', now)
        .get()

      console.log(`Found ${connectionsSnapshot.size} connections to sync`)

      const syncPromises = connectionsSnapshot.docs.map(async (connectionDoc) => {
        const connection = { id: connectionDoc.id, ...connectionDoc.data() } as APIConnection

        try {
          // Decrypt credentials
          const credentials = CredentialEncryption.decryptCredentials(connection.credentials)

          // Create connector
          const connector = ConnectorFactory.createConnector(connection.provider, credentials)

          // Sync last 2 days (to catch any missed data)
          const endDate = new Date().toISOString().split('T')[0]
          const startDate = (() => {
            const d = new Date()
            d.setDate(d.getDate() - 2)
            return d.toISOString().split('T')[0]
          })()

          // Create sync history
          const syncRef = db.collection('syncHistory').doc()
          await syncRef.set({
            connectionId: connection.id,
            organizationId: connection.organizationId,
            provider: connection.provider,
            startTime: admin.firestore.Timestamp.now(),
            status: 'in_progress',
            recordsSynced: 0,
            recordsFailed: 0,
            errors: []
          })

          // Perform sync
          const syncResult = await connector.sync(
            startDate,
            endDate,
            async (usageData: UsageData[]) => {
              const batch = db.batch()
              
              for (const data of usageData) {
                const usageRef = db.collection('usage').doc()
                batch.set(usageRef, {
                  ...data,
                  organizationId: connection.organizationId,
                  connectionId: connection.id,
                  syncId: syncRef.id,
                  createdAt: admin.firestore.Timestamp.now()
                })
              }

              await batch.commit()
            }
          )

          // Update sync history
          await syncRef.update({
            endTime: admin.firestore.Timestamp.now(),
            status: syncResult.success ? 'success' : 'failed',
            recordsSynced: syncResult.recordsSynced,
            recordsFailed: syncResult.recordsFailed,
            errors: syncResult.errors,
            metadata: syncResult.metadata
          })

          // Calculate next sync time
          const nextSyncDate = new Date()
          if (connection.syncFrequency === 'hourly') {
            nextSyncDate.setHours(nextSyncDate.getHours() + 1)
          } else {
            nextSyncDate.setDate(nextSyncDate.getDate() + 1)
            nextSyncDate.setHours(2, 0, 0, 0)
          }

          // Update connection
          await connectionDoc.ref.update({
            lastSyncAt: admin.firestore.Timestamp.now(),
            nextSyncAt: admin.firestore.Timestamp.fromDate(nextSyncDate),
            status: syncResult.success ? 'active' : 'failed',
            lastError: syncResult.success ? admin.firestore.FieldValue.delete() : syncResult.errors[0],
            updatedAt: admin.firestore.Timestamp.now()
          })

          console.log(`Synced connection ${connection.id}: ${syncResult.recordsSynced} records`)
        } catch (error) {
          console.error(`Error syncing connection ${connection.id}:`, error)
          
          // Update connection status
          await connectionDoc.ref.update({
            status: 'failed',
            lastError: error instanceof Error ? error.message : String(error),
            updatedAt: admin.firestore.Timestamp.now()
          })
        }
      })

      await Promise.all(syncPromises)

      console.log('Scheduled API sync complete')
    } catch (error) {
      console.error('Scheduled sync error:', error)
      throw error
    }
  })


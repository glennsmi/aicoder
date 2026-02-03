import { useState, useEffect } from 'react'
import { useOrganization } from '../contexts/OrganizationContext'
import { 
  AIProvider, 
  APIConnection, 
  TestConnectionRequest,
  TestConnectionResult,
  AddConnectionRequest,
  SyncConnectionRequest,
  SyncResult
} from '@cursor-costs/shared'
import { db } from '../config/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'

const functions = getFunctions()

const AVAILABLE_PROVIDERS: { 
  id: AIProvider
  name: string
  description: string
  icon: string
  requiresOrg?: boolean
  documentationUrl?: string
}[] = [
  {
    id: 'google_cloud_billing',
    name: 'Google Cloud Billing (BigQuery Export)',
    description: 'Ingest GCP costs from BigQuery Billing Export (optional per-user via resource labels)',
    icon: '☁️',
    requiresOrg: false,
    documentationUrl: 'https://docs.cloud.google.com/billing/docs/reference/rest'
  },
  {
    id: 'github_copilot',
    name: 'GitHub Copilot',
    description: 'Track Copilot usage from GitHub Enterprise',
    icon: '🐙',
    requiresOrg: true,
    documentationUrl: 'https://docs.github.com/en/rest/copilot'
  },
  {
    id: 'openai_codex',
    name: 'OpenAI',
    description: 'Monitor OpenAI API usage',
    icon: '✨',
    requiresOrg: false,
    documentationUrl: 'https://platform.openai.com/docs/api-reference'
  },
  {
    id: 'anthropic_usage',
    name: 'Anthropic Claude (Usage)',
    description: 'Track Claude API organization usage',
    icon: '🤖',
    requiresOrg: false,
    documentationUrl: 'https://docs.claude.com/en/api/usage-cost-api'
  },
  {
    id: 'anthropic_code',
    name: 'Anthropic Claude Code Analytics',
    description: 'Track Claude Code developer metrics',
    icon: '💻',
    requiresOrg: false,
    documentationUrl: 'https://docs.claude.com/en/api/claude-code-analytics-api'
  },
  {
    id: 'cursor',
    name: 'Cursor (CSV Only)',
    description: 'Manual CSV upload - API not available',
    icon: '🖱️',
    requiresOrg: false
  },
  {
    id: 'codeium',
    name: 'Codeium (Coming Soon)',
    description: 'Monitor Codeium Teams usage',
    icon: '🚀',
    requiresOrg: false
  },
  {
    id: 'tabnine',
    name: 'Tabnine (Coming Soon)',
    description: 'Track Tabnine Enterprise usage',
    icon: '⚡',
    requiresOrg: false
  },
]

export default function APIConnectionManager() {
  const { organization } = useOrganization()
  const [connections, setConnections] = useState<APIConnection[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [credentials, setCredentials] = useState({
    apiKey: '',
    token: '',
    organizationId: '',
    enterprise: '',
    additionalConfig: '',
    // Google Cloud Billing (BigQuery export)
    serviceAccountJson: '',
    bigQueryProjectId: '',
    datasetId: '',
    tableId: '',
    bigQueryLocation: '',
    attributionLabelKey: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testingConnection, setTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null)
  const [syncingConnection, setSyncingConnection] = useState<string | null>(null)

  // Load connections from Firestore
  useEffect(() => {
    if (!organization?.id) return

    const q = query(
      collection(db, 'apiConnections'),
      where('organizationId', '==', organization.id)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedConnections = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as APIConnection))
      setConnections(loadedConnections)
    })

    return () => unsubscribe()
  }, [organization?.id])

  const handleTestConnection = async () => {
    if (!selectedProvider) return

    setTestingConnection(true)
    setTestResult(null)
    setError(null)

    try {
      // Build credentials object based on provider
      const providerCredentials = buildCredentialsForProvider(selectedProvider, credentials)

      const testRequest: TestConnectionRequest = {
        provider: selectedProvider,
        credentials: providerCredentials
      }

      // Call Cloud Function
      const testApiConnection = httpsCallable<TestConnectionRequest, TestConnectionResult>(
        functions,
        'testApiConnection'
      )
      const result = await testApiConnection(testRequest)
      
      setTestResult(result.data)
    } catch (err: any) {
      console.error('Test connection error:', err)
      setTestResult({
        success: false,
        message: err.message || 'Connection failed. Please check your credentials.'
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const handleAddConnection = async () => {
    if (!selectedProvider || !organization?.id || !displayName.trim()) {
      setError('Please provide all required information')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const providerCredentials = buildCredentialsForProvider(selectedProvider, credentials)

      const addRequest: AddConnectionRequest = {
        organizationId: organization.id,
        provider: selectedProvider,
        displayName: displayName.trim(),
        credentials: providerCredentials,
        syncFrequency: 'daily'
      }

      // Call Cloud Function
      const addApiConnection = httpsCallable<AddConnectionRequest, any>(
        functions,
        'addApiConnection'
      )
      await addApiConnection(addRequest)

      // Close modal and reset form
      setShowAddModal(false)
      setSelectedProvider(null)
      setDisplayName('')
      setCredentials({ 
        apiKey: '', 
        token: '',
        organizationId: '', 
        enterprise: '',
        additionalConfig: '',
        serviceAccountJson: '',
        bigQueryProjectId: '',
        datasetId: '',
        tableId: '',
        bigQueryLocation: '',
        attributionLabelKey: ''
      })
      setTestResult(null)
    } catch (err: any) {
      console.error('Add connection error:', err)
      setError(err.message || 'Failed to add connection')
    } finally {
      setLoading(false)
    }
  }

  const handleSyncConnection = async (connectionId: string) => {
    setSyncingConnection(connectionId)
    setError(null)

    try {
      const syncRequest: SyncConnectionRequest = {
        connectionId
      }

      // Call Cloud Function
      const syncApiConnection = httpsCallable<SyncConnectionRequest, SyncResult>(
        functions,
        'syncApiConnection'
      )
      const result = await syncApiConnection(syncRequest)

      if (!result.data.success) {
        throw new Error(result.data.errors.join(', '))
      }

      // Show success message (you could add a toast notification here)
      console.log(`Synced ${result.data.recordsSynced} records successfully`)
    } catch (err: any) {
      console.error('Sync connection error:', err)
      setError(err.message || 'Failed to sync connection')
    } finally {
      setSyncingConnection(null)
    }
  }

  const buildCredentialsForProvider = (provider: AIProvider, creds: any) => {
    switch (provider) {
      case 'google_cloud_billing':
        return {
          type: 'bigquery_billing_export',
          serviceAccountJson: creds.serviceAccountJson,
          bigQueryProjectId: creds.bigQueryProjectId,
          datasetId: creds.datasetId,
          tableId: creds.tableId,
          bigQueryLocation: creds.bigQueryLocation?.trim() || undefined,
          attributionLabelKey: creds.attributionLabelKey?.trim() || undefined
        }

      case 'github_copilot':
        return {
          type: 'pat',
          token: creds.token || creds.apiKey,
          organization: creds.organizationId,
          enterprise: creds.enterprise || undefined
        }

      case 'openai_codex':
        return {
          apiKey: creds.apiKey,
          organizationId: creds.organizationId || undefined
        }

      case 'anthropic_usage':
      case 'anthropic_code':
      case 'claude_code':
        return {
          apiKey: creds.apiKey
        }

      case 'cursor':
        return {
          method: 'csv'
        }

      default:
        return {
          apiKey: creds.apiKey,
          ...( creds.additionalConfig ? JSON.parse(creds.additionalConfig) : {})
        }
    }
  }

  const getProviderInfo = (providerId: AIProvider) => {
    return AVAILABLE_PROVIDERS.find((p) => p.id === providerId)
  }

  const isProviderSupported = (providerId: AIProvider) => {
    return [
      'google_cloud_billing',
      'github_copilot',
      'openai_codex',
      'anthropic_usage',
      'anthropic_code',
      'claude_code'
    ].includes(providerId)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          API Connections
        </h1>
        <p className="text-neutral-500 dark:text-gray-400">
          Connect your AI coding tools to automatically sync usage data
        </p>
      </div>

      {/* Active Connections */}
      {connections.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
            Active Connections
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connections.map((connection) => {
              const provider = getProviderInfo(connection.provider)
              const isSyncing = syncingConnection === connection.id
              return (
                <div
                  key={connection.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{provider?.icon}</div>
                      <div>
                        <h3 className="font-semibold text-neutral-900 dark:text-white">
                          {connection.displayName}
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-gray-400">
                          {connection.status === 'active' && '✓ Connected'}
                          {connection.status === 'failed' && '⚠️ Error'}
                          {connection.status === 'paused' && '⏸ Paused'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-gray-400">Last Sync:</span>
                      <span className="text-neutral-900 dark:text-white font-medium">
                        {connection.lastSyncAt 
                          ? new Date(connection.lastSyncAt.toDate()).toLocaleString() 
                          : 'Never'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-gray-400">Frequency:</span>
                      <span className="text-neutral-900 dark:text-white font-medium capitalize">
                        {connection.syncFrequency}
                      </span>
                    </div>
                    {connection.lastError && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                        <p className="text-xs text-red-600 dark:text-red-400">{connection.lastError}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button 
                      onClick={() => handleSyncConnection(connection.id)}
                      disabled={isSyncing || connection.status === 'paused'}
                      className="w-full px-4 py-2 bg-accent-400 text-neutral-900 font-medium rounded-lg hover:bg-accent-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Available Providers */}
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
          Available Integrations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AVAILABLE_PROVIDERS.map((provider) => {
            const isSupported = isProviderSupported(provider.id)
            const isAlreadyConnected = connections.some(c => c.provider === provider.id)

            return (
              <div
                key={provider.id}
                className={`bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 ${
                  isSupported ? 'hover:border-accent-400 dark:hover:border-accent-400' : 'opacity-60'
                } transition-colors`}
              >
                <div className="text-4xl mb-3">{provider.icon}</div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                  {provider.name}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-gray-400 mb-4 min-h-[40px]">
                  {provider.description}
                </p>
                {provider.documentationUrl && isSupported && (
                  <a
                    href={provider.documentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent-400 hover:text-accent-500 mb-3 block"
                  >
                    📚 View Documentation →
                  </a>
                )}
                <button
                  onClick={() => {
                    if (isSupported && !isAlreadyConnected) {
                      setSelectedProvider(provider.id)
                      setDisplayName(provider.name)
                      setShowAddModal(true)
                    }
                  }}
                  disabled={!isSupported || isAlreadyConnected}
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-neutral-900 dark:text-white font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAlreadyConnected ? 'Already Connected' : isSupported ? 'Connect' : 'Coming Soon'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Connection Modal */}
      {showAddModal && selectedProvider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-5xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">
              Connect {getProviderInfo(selectedProvider)?.name}
            </h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {testResult && (
              <div
                className={`mb-4 p-3 rounded-lg border ${
                  testResult.success
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}
              >
                <p
                  className={`text-sm font-medium ${
                    testResult.success
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {testResult.message}
                </p>
                {testResult.metadata && (
                  <div className="mt-2 text-xs text-neutral-600 dark:text-gray-400 space-y-1">
                    {Object.entries(testResult.metadata).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">{key}:</span> {String(value)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className={`grid grid-cols-1 ${selectedProvider === 'google_cloud_billing' ? 'lg:grid-cols-2' : ''} gap-6`}>
              {/* Left: form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g., Production API"
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-neutral-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-400"
                  />
                </div>

                {selectedProvider === 'github_copilot' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                        Personal Access Token *
                      </label>
                      <input
                        type="password"
                        value={credentials.token}
                        onChange={(e) => setCredentials({ ...credentials, token: e.target.value })}
                        placeholder="ghp_..."
                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-neutral-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                        Organization Name (or Enterprise)
                      </label>
                      <input
                        type="text"
                        value={credentials.organizationId}
                        onChange={(e) => setCredentials({ ...credentials, organizationId: e.target.value })}
                        placeholder="your-org-name"
                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-neutral-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-400"
                      />
                    </div>
                  </>
                ) : selectedProvider === 'google_cloud_billing' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                        Service Account JSON *
                      </label>
                      <textarea
                        value={credentials.serviceAccountJson}
                        onChange={(e) => setCredentials({ ...credentials, serviceAccountJson: e.target.value })}
                        placeholder="{ ... }"
                        rows={6}
                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-neutral-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-400 font-mono text-xs"
                      />
                      <p className="mt-1 text-xs text-neutral-500 dark:text-gray-400">
                        Needs BigQuery permissions to read the billing export table.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                        BigQuery Project ID *
                      </label>
                      <input
                        type="text"
                        value={credentials.bigQueryProjectId}
                        onChange={(e) => setCredentials({ ...credentials, bigQueryProjectId: e.target.value })}
                        placeholder="my-bq-project"
                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-neutral-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                        Dataset ID *
                      </label>
                      <input
                        type="text"
                        value={credentials.datasetId}
                        onChange={(e) => setCredentials({ ...credentials, datasetId: e.target.value })}
                        placeholder="billing_export"
                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-neutral-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                        Table ID *
                      </label>
                      <input
                        type="text"
                        value={credentials.tableId}
                        onChange={(e) => setCredentials({ ...credentials, tableId: e.target.value })}
                        placeholder="gcp_billing_export_v1_XXXXXX_YYYYYY"
                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-neutral-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                        BigQuery Location (Optional)
                      </label>
                      <input
                        type="text"
                        value={credentials.bigQueryLocation}
                        onChange={(e) => setCredentials({ ...credentials, bigQueryLocation: e.target.value })}
                        placeholder="US or EU (or a region like europe-west2)"
                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-neutral-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-400"
                      />
                      <p className="mt-1 text-xs text-neutral-500 dark:text-gray-400">
                        Only needed if you see a location mismatch error while testing.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                        Attribution Label Key (Optional)
                      </label>
                      <input
                        type="text"
                        value={credentials.attributionLabelKey}
                        onChange={(e) => setCredentials({ ...credentials, attributionLabelKey: e.target.value })}
                        placeholder="developer_email"
                        className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-neutral-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-400"
                      />
                      <p className="mt-1 text-xs text-neutral-500 dark:text-gray-400">
                        If your GCP resources are labeled (e.g. <span className="font-mono">developer_email</span>), we’ll group costs per label value.
                      </p>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      API Key *
                    </label>
                    <input
                      type="password"
                      value={credentials.apiKey}
                      onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                      placeholder="Enter your API key"
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-neutral-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-400"
                    />
                  </div>
                )}

                {selectedProvider === 'openai_codex' && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                      Organization ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={credentials.organizationId}
                      onChange={(e) => setCredentials({ ...credentials, organizationId: e.target.value })}
                      placeholder="org-..."
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-neutral-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-400"
                    />
                  </div>
                )}
              </div>

              {/* Right: help accordions (only for GCP billing) */}
              {selectedProvider === 'google_cloud_billing' && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Setup help (step-by-step)
                    </h4>
                    <p className="mt-1 text-xs text-neutral-600 dark:text-gray-400">
                      These steps walk you through finding each field in Google Cloud Console.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <details className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                          Service Account JSON
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-gray-400 group-open:hidden">Expand</span>
                        <span className="text-xs text-neutral-500 dark:text-gray-400 hidden group-open:inline">Collapse</span>
                      </summary>
                      <div className="px-4 pb-4 text-xs text-neutral-700 dark:text-gray-300 space-y-2">
                        <ol className="list-decimal pl-5 space-y-2">
                          <li>
                            Open <span className="font-medium">Google Cloud Console</span> → <span className="font-medium">IAM &amp; Admin</span> → <span className="font-medium">Service Accounts</span>.
                          </li>
                          <li>
                            Choose (or create) a service account dedicated to billing export reads (recommended).
                          </li>
                          <li>
                            Click the service account → <span className="font-medium">Keys</span> tab → <span className="font-medium">Add key</span> → <span className="font-medium">Create new key</span> → JSON.
                          </li>
                          <li>
                            Download the JSON, open it locally, and paste the <span className="font-mono">entire file contents</span> into this field.
                          </li>
                        </ol>
                        <div className="rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-3">
                          <p className="font-semibold mb-1">Minimum permissions (typical)</p>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><span className="font-mono">BigQuery Job User</span> on the BigQuery project</li>
                            <li><span className="font-mono">BigQuery Data Viewer</span> on the billing export dataset/table</li>
                          </ul>
                        </div>
                      </div>
                    </details>

                    <details className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                          BigQuery Project ID
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-gray-400 group-open:hidden">Expand</span>
                        <span className="text-xs text-neutral-500 dark:text-gray-400 hidden group-open:inline">Collapse</span>
                      </summary>
                      <div className="px-4 pb-4 text-xs text-neutral-700 dark:text-gray-300 space-y-2">
                        <ol className="list-decimal pl-5 space-y-2">
                          <li>Go to <span className="font-medium">BigQuery</span> in Google Cloud Console.</li>
                          <li>In the left panel (“Explorer”), find the project that contains the billing export dataset.</li>
                          <li>Use the project’s <span className="font-medium">Project ID</span> (not the display name).</li>
                        </ol>
                        <p className="text-neutral-600 dark:text-gray-400">
                          Tip: Project ID looks like <span className="font-mono">my-bq-project</span>.
                        </p>
                      </div>
                    </details>

                    <details className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                          Dataset ID
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-gray-400 group-open:hidden">Expand</span>
                        <span className="text-xs text-neutral-500 dark:text-gray-400 hidden group-open:inline">Collapse</span>
                      </summary>
                      <div className="px-4 pb-4 text-xs text-neutral-700 dark:text-gray-300 space-y-2">
                        <ol className="list-decimal pl-5 space-y-2">
                          <li>In <span className="font-medium">BigQuery</span> → Explorer, expand your BigQuery project.</li>
                          <li>Find the dataset created by <span className="font-medium">Cloud Billing Export</span> (common names: <span className="font-mono">billing_export</span>, <span className="font-mono">gcp_billing_export</span>).</li>
                          <li>The dataset ID is the dataset name you see in Explorer.</li>
                        </ol>
                      </div>
                    </details>

                    <details className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                          Table ID
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-gray-400 group-open:hidden">Expand</span>
                        <span className="text-xs text-neutral-500 dark:text-gray-400 hidden group-open:inline">Collapse</span>
                      </summary>
                      <div className="px-4 pb-4 text-xs text-neutral-700 dark:text-gray-300 space-y-2">
                        <ol className="list-decimal pl-5 space-y-2">
                          <li>Expand the dataset in BigQuery Explorer to see tables/views.</li>
                          <li>Select the billing export table (often starts with <span className="font-mono">gcp_billing_export</span>).</li>
                          <li>Copy the table ID exactly as shown (no project/dataset prefix needed here).</li>
                        </ol>
                        <p className="text-neutral-600 dark:text-gray-400">
                          Tip: If you enabled “Detailed cost export”, you may see more than one table/view.
                        </p>
                      </div>
                    </details>

                    <details className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                          BigQuery Location (optional)
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-gray-400 group-open:hidden">Expand</span>
                        <span className="text-xs text-neutral-500 dark:text-gray-400 hidden group-open:inline">Collapse</span>
                      </summary>
                      <div className="px-4 pb-4 text-xs text-neutral-700 dark:text-gray-300 space-y-2">
                        <p>
                          Leave this blank unless testing fails with a “location mismatch” error.
                        </p>
                        <ol className="list-decimal pl-5 space-y-2">
                          <li>In BigQuery, click the dataset → look for <span className="font-medium">Location</span> in dataset details.</li>
                          <li>Enter <span className="font-mono">EU</span> or <span className="font-mono">US</span> for multi-region datasets, or a region like <span className="font-mono">europe-west2</span>.</li>
                        </ol>
                      </div>
                    </details>

                    <details className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                          Attribution Label Key (optional)
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-gray-400 group-open:hidden">Expand</span>
                        <span className="text-xs text-neutral-500 dark:text-gray-400 hidden group-open:inline">Collapse</span>
                      </summary>
                      <div className="px-4 pb-4 text-xs text-neutral-700 dark:text-gray-300 space-y-2">
                        <p>
                          This enables “cost per developer” <span className="font-medium">only if</span> your billed resources are consistently labeled.
                        </p>
                        <ol className="list-decimal pl-5 space-y-2">
                          <li>Pick a label key (example: <span className="font-mono">developer_email</span> or <span className="font-mono">owner</span>).</li>
                          <li>Ensure resources that incur cost (Vertex AI, GCE, GKE, etc.) are labeled with that key.</li>
                          <li>Enter just the <span className="font-medium">key</span> here. The connector groups costs by label <span className="font-medium">value</span>.</li>
                        </ol>
                        <p className="text-neutral-600 dark:text-gray-400">
                          If you don’t have labels yet, you’ll still get accurate total/project/service costs—just not developer attribution.
                        </p>
                      </div>
                    </details>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={handleTestConnection}
                disabled={
                  testingConnection || 
                  (
                    selectedProvider === 'google_cloud_billing'
                      ? !credentials.serviceAccountJson ||
                        !credentials.bigQueryProjectId ||
                        !credentials.datasetId ||
                        !credentials.tableId
                      : (!credentials.apiKey && !credentials.token)
                  ) ||
                  (selectedProvider === 'github_copilot' && !credentials.organizationId)
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-neutral-900 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingConnection ? 'Testing...' : 'Test Connection'}
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setSelectedProvider(null)
                    setDisplayName('')
                    setCredentials({ 
                      apiKey: '', 
                      token: '',
                      organizationId: '', 
                      enterprise: '',
                      additionalConfig: '',
                      serviceAccountJson: '',
                      bigQueryProjectId: '',
                      datasetId: '',
                      tableId: '',
                      bigQueryLocation: '',
                      attributionLabelKey: ''
                    })
                    setTestResult(null)
                    setError(null)
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-neutral-900 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddConnection}
                  disabled={loading || !testResult?.success || !displayName.trim()}
                  className="flex-1 px-4 py-2 bg-accent-400 text-neutral-900 font-semibold rounded-lg hover:bg-accent-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Adding...' : 'Add Connection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useOrganization } from '../contexts/OrganizationContext'
import { AIProvider } from '@shared'

const AVAILABLE_PROVIDERS: { id: AIProvider; name: string; description: string; icon: string }[] = [
  {
    id: 'cursor',
    name: 'Cursor',
    description: 'Import usage data directly from Cursor API',
    icon: '🖱️',
  },
  {
    id: 'github_copilot',
    name: 'GitHub Copilot',
    description: 'Track Copilot usage from GitHub Enterprise',
    icon: '🐙',
  },
  {
    id: 'codeium',
    name: 'Codeium',
    description: 'Monitor Codeium Teams usage',
    icon: '🚀',
  },
  {
    id: 'claude_code',
    name: 'Claude Code (Anthropic)',
    description: 'Track Claude API usage',
    icon: '🤖',
  },
  {
    id: 'openai_codex',
    name: 'OpenAI',
    description: 'Monitor OpenAI API usage',
    icon: '✨',
  },
  {
    id: 'tabnine',
    name: 'Tabnine',
    description: 'Track Tabnine Enterprise usage',
    icon: '⚡',
  },
]

export default function APIConnectionManager() {
  const { organization } = useOrganization()
  const [connections, setConnections] = useState<any[]>([]) // TODO: Replace with real data from Firestore
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null)
  const [credentials, setCredentials] = useState({
    apiKey: '',
    organizationId: '',
    additionalConfig: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testingConnection, setTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleTestConnection = async () => {
    if (!selectedProvider) return

    setTestingConnection(true)
    setTestResult(null)
    setError(null)

    try {
      // TODO: Call Cloud Function to test API connection
      console.log('Testing connection:', {
        provider: selectedProvider,
        credentials,
      })

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))

      setTestResult({
        success: true,
        message: 'Connection successful! Ready to sync data.',
      })
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection failed. Please check your credentials.',
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const handleAddConnection = async () => {
    if (!selectedProvider || !credentials.apiKey) {
      setError('Please provide all required credentials')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // TODO: Call Cloud Function to add API connection
      console.log('Adding connection:', {
        provider: selectedProvider,
        credentials,
      })

      setShowAddModal(false)
      setSelectedProvider(null)
      setCredentials({ apiKey: '', organizationId: '', additionalConfig: '' })
      setTestResult(null)
    } catch (err: any) {
      setError(err.message || 'Failed to add connection')
    } finally {
      setLoading(false)
    }
  }

  const getProviderInfo = (providerId: string) => {
    return AVAILABLE_PROVIDERS.find((p) => p.id === providerId)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gunmetal-900 dark:text-white mb-2">
          API Connections
        </h1>
        <p className="text-gunmetal-600 dark:text-gray-400">
          Connect your AI coding tools to automatically sync usage data
        </p>
      </div>

      {/* Active Connections */}
      {connections.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gunmetal-900 dark:text-white mb-4">
            Active Connections
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connections.map((connection) => {
              const provider = getProviderInfo(connection.provider)
              return (
                <div
                  key={connection.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{provider?.icon}</div>
                      <div>
                        <h3 className="font-semibold text-gunmetal-900 dark:text-white">
                          {provider?.name}
                        </h3>
                        <p className="text-xs text-gunmetal-600 dark:text-gray-400">
                          {connection.status === 'active' ? '✓ Connected' : '⚠️ Error'}
                        </p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gunmetal-600 dark:text-gray-400">Last Sync:</span>
                      <span className="text-gunmetal-900 dark:text-white font-medium">
                        {connection.lastSync ? new Date(connection.lastSync).toLocaleString() : 'Never'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gunmetal-600 dark:text-gray-400">Records:</span>
                      <span className="text-gunmetal-900 dark:text-white font-medium">
                        {connection.recordCount || 0}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button className="w-full px-4 py-2 bg-primary-500 text-gunmetal-900 font-medium rounded-lg hover:bg-primary-600 transition-colors">
                      Sync Now
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Available Providers */}
      <div>
        <h2 className="text-xl font-semibold text-gunmetal-900 dark:text-white mb-4">
          Available Integrations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AVAILABLE_PROVIDERS.map((provider) => (
            <div
              key={provider.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors"
            >
              <div className="text-4xl mb-3">{provider.icon}</div>
              <h3 className="text-lg font-semibold text-gunmetal-900 dark:text-white mb-2">
                {provider.name}
              </h3>
              <p className="text-sm text-gunmetal-600 dark:text-gray-400 mb-4">
                {provider.description}
              </p>
              <button
                onClick={() => {
                  setSelectedProvider(provider.id)
                  setShowAddModal(true)
                }}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gunmetal-900 dark:text-white font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Connect
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add Connection Modal */}
      {showAddModal && selectedProvider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gunmetal-900 dark:text-white mb-4">
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
                  className={`text-sm ${
                    testResult.success
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {testResult.message}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gunmetal-900 dark:text-white mb-2">
                  API Key *
                </label>
                <input
                  type="password"
                  value={credentials.apiKey}
                  onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                  placeholder="Enter your API key"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gunmetal-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {(selectedProvider === 'github_copilot' || selectedProvider === 'openai') && (
                <div>
                  <label className="block text-sm font-medium text-gunmetal-900 dark:text-white mb-2">
                    Organization ID
                  </label>
                  <input
                    type="text"
                    value={credentials.organizationId}
                    onChange={(e) => setCredentials({ ...credentials, organizationId: e.target.value })}
                    placeholder="Enter your organization ID"
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gunmetal-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gunmetal-900 dark:text-white mb-2">
                  Additional Configuration (JSON, optional)
                </label>
                <textarea
                  value={credentials.additionalConfig}
                  onChange={(e) => setCredentials({ ...credentials, additionalConfig: e.target.value })}
                  placeholder='{"key": "value"}'
                  rows={3}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gunmetal-900 dark:text-white placeholder:text-gray-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={handleTestConnection}
                disabled={testingConnection || !credentials.apiKey}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gunmetal-900 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingConnection ? 'Testing...' : 'Test Connection'}
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setSelectedProvider(null)
                    setCredentials({ apiKey: '', organizationId: '', additionalConfig: '' })
                    setTestResult(null)
                    setError(null)
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gunmetal-900 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddConnection}
                  disabled={loading || !credentials.apiKey || !testResult?.success}
                  className="flex-1 px-4 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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


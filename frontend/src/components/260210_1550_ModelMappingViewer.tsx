import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/config/firebaseApp'

type ModelAliasesBySource = {
  cursorCsvAliases?: string[]
  ccusageDailyJsonAliases?: string[]
  anthropicUsageApiAliases?: string[]
  anthropicCodeApiAliases?: string[]
  openaiApiAliases?: string[]
  githubCopilotApiAliases?: string[]
  geminiApiAliases?: string[]
  codeiumApiAliases?: string[]
}

type ModelMappingDoc = {
  id: string
  canonicalName: string
  displayName?: string
  aliasesBySource?: ModelAliasesBySource
  allAliases?: string[]
  sources?: string[]
  version?: number
}

const SOURCE_COLUMNS: Array<{ key: keyof ModelAliasesBySource; label: string }> = [
  { key: 'cursorCsvAliases', label: 'Cursor CSV' },
  { key: 'ccusageDailyJsonAliases', label: 'ccusage JSON' },
  { key: 'anthropicUsageApiAliases', label: 'Anthropic Usage API' },
  { key: 'anthropicCodeApiAliases', label: 'Anthropic Code API' },
  { key: 'openaiApiAliases', label: 'OpenAI API' },
  { key: 'githubCopilotApiAliases', label: 'GitHub Copilot API' },
  { key: 'geminiApiAliases', label: 'Gemini API' },
  { key: 'codeiumApiAliases', label: 'Codeium API' },
]

export default function ModelMappingViewer() {
  const [rows, setRows] = useState<ModelMappingDoc[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRows = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const ref = collection(db, 'modelMappings')
      const snap = await getDocs(query(ref, orderBy('canonicalName', 'asc')))
      const nextRows: ModelMappingDoc[] = snap.docs.map((d) => {
        const data = d.data() as any
        return {
          id: d.id,
          canonicalName: String(data?.canonicalName || d.id),
          displayName: typeof data?.displayName === 'string' ? data.displayName : undefined,
          aliasesBySource: (data?.aliasesBySource && typeof data.aliasesBySource === 'object')
            ? (data.aliasesBySource as ModelAliasesBySource)
            : undefined,
          allAliases: Array.isArray(data?.allAliases) ? data.allAliases.map((v: unknown) => String(v)) : [],
          sources: Array.isArray(data?.sources) ? data.sources.map((v: unknown) => String(v)) : [],
          version: typeof data?.version === 'number' ? data.version : undefined,
        }
      })
      setRows(nextRows)
    } catch (e: any) {
      console.error('Failed to load model mappings:', e)
      setError(e?.message || 'Failed to load model mappings')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadRows()
  }, [])

  const handleSync = async () => {
    setIsSyncing(true)
    setError(null)
    try {
      const sync = httpsCallable(functions, 'syncModelMappings')
      await sync({})
      await loadRows()
    } catch (e: any) {
      console.error('Failed to sync model mappings:', e)
      setError(e?.message || 'Failed to sync model mappings')
    } finally {
      setIsSyncing(false)
    }
  }

  const sourceCoverage = useMemo(() => {
    const out = new Map<string, number>()
    for (const row of rows) {
      for (const source of row.sources || []) {
        out.set(source, (out.get(source) || 0) + 1)
      }
    }
    return Array.from(out.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [rows])

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gunmetal-900">Canonical Model Mapping (Read-only)</h3>
          <p className="text-sm text-gunmetal-700">
            Source aliases are mapped to canonical model names. One column per ingest source.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className="px-3 py-2 rounded-lg bg-secondary-800 text-white text-sm hover:bg-secondary-700 disabled:opacity-60"
        >
          {isSyncing ? 'Syncing…' : 'Sync Mapping Seeds'}
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="mb-4 text-xs text-gunmetal-600">
        <span className="font-medium">Mapped models:</span> {rows.length}
        <span className="mx-2">•</span>
        <span className="font-medium">Source coverage:</span>{' '}
        {sourceCoverage.length > 0
          ? sourceCoverage.map(([source, count]) => `${source} (${count})`).join(', ')
          : 'None yet'}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left p-2 font-semibold">Canonical</th>
              <th className="text-left p-2 font-semibold">Display Name</th>
              {SOURCE_COLUMNS.map((col) => (
                <th key={col.key} className="text-left p-2 font-semibold min-w-[180px]">
                  {col.label}
                </th>
              ))}
              <th className="text-left p-2 font-semibold">All Aliases</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="p-3 text-sm text-gunmetal-600" colSpan={SOURCE_COLUMNS.length + 3}>
                  Loading model mappings…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td className="p-3 text-sm text-gunmetal-600" colSpan={SOURCE_COLUMNS.length + 3}>
                  No mapping docs found yet.
                </td>
              </tr>
            )}
            {!isLoading && rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 align-top">
                <td className="p-2 font-medium">{row.canonicalName}</td>
                <td className="p-2">{row.displayName || '—'}</td>
                {SOURCE_COLUMNS.map((col) => {
                  const vals = row.aliasesBySource?.[col.key] || []
                  return (
                    <td key={`${row.id}-${col.key}`} className="p-2">
                      {vals.length > 0 ? vals.join(', ') : '—'}
                    </td>
                  )
                })}
                <td className="p-2">{(row.allAliases || []).length > 0 ? row.allAliases!.join(', ') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

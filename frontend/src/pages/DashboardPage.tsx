import { useEffect, useMemo, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { BarChart3, SearchX, Users, Trophy } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import CursorUsageChart from '@/components/CursorUsageChart'
import { functions } from '@/config/firebaseApp'
import { useOrgUsageEvents } from '@/hooks/useOrgUsageEvents'
import { OrgUsageRow } from '@/lib/orgUsageEvents'

function formatTokensCompact(num: number) {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return Math.round(num).toString()
}

function formatUsd(amount: number) {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

type ActiveWindow = { startMs: number | null; endMs: number | null }

export default function DashboardPage() {
  const { user } = useAuth()
  const { organization, members, teams, loading: orgLoading } = useOrganization()

  const retentionDays = Number((organization as any)?.settings?.dataRetentionDays) || 365
  const baseWindow = useMemo(() => {
    const endMs = Date.now()
    const startMs = endMs - Math.max(1, Math.min(3650, retentionDays)) * 24 * 60 * 60 * 1000
    return { startMs, endMs }
  }, [retentionDays])

  const { rows, loading: rowsLoading, error: rowsError, refresh } = useOrgUsageEvents(baseWindow)

  const [selectedTeamId, setSelectedTeamId] = useState<string>('all')
  const [selectedUserId, setSelectedUserId] = useState<string>('all')
  const [selectedStreamIds, setSelectedStreamIds] = useState<string[]>([])
  const [activeWindow, setActiveWindow] = useState<ActiveWindow>({ startMs: null, endMs: null })

  const [showAllUsers, setShowAllUsers] = useState(false)
  const [showAllTeams, setShowAllTeams] = useState(false)

  const [materializeStatus, setMaterializeStatus] = useState<{
    attempted: boolean
    running: boolean
    error: string | null
    result?: any
  }>({ attempted: false, running: false, error: null })

  const streamOptions = useMemo(() => {
    const seen = new Set<string>()
    for (const r of rows) {
      if (r.streamId) seen.add(r.streamId)
    }
    // Ensure local upload streams exist as options even if empty
    seen.add('cursor_csv')
    seen.add('ccusage_daily_json')

    const toLabel = (id: string) => {
      if (id === 'cursor_csv') return 'Cursor CSV (local)'
      if (id === 'ccusage_daily_json') return 'Claude Code ccusage (local)'
      if (id.startsWith('api:')) return `API connection ${id.slice(4)}`
      return id
    }

    return Array.from(seen).sort().map((id) => ({ id, label: toLabel(id) }))
  }, [rows])

  // Keep filter combinations sane
  useEffect(() => {
    if (selectedUserId !== 'all') {
      const member = members.find((m) => m.userId === selectedUserId)
      if (member?.teamId && selectedTeamId === 'all') {
        // Auto-resolve team when selecting a user (best-effort).
        setSelectedTeamId(member.teamId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId])

  const filteredRows: OrgUsageRow[] = useMemo(() => {
    let out = rows
    if (selectedTeamId !== 'all') {
      out = out.filter((r) => r.teamId === selectedTeamId)
    }
    if (selectedUserId !== 'all') {
      out = out.filter((r) => r.userId === selectedUserId)
    }
    if (selectedStreamIds.length > 0) {
      const s = new Set(selectedStreamIds)
      out = out.filter((r) => r.streamId && s.has(r.streamId))
    }
    return out
  }, [rows, selectedTeamId, selectedUserId, selectedStreamIds])

  const windowFilteredRows: OrgUsageRow[] = useMemo(() => {
    const startMs = activeWindow.startMs
    const endMs = activeWindow.endMs
    if (!startMs || !endMs) return filteredRows
    return filteredRows.filter((r) => r.timestamp >= startMs && r.timestamp <= endMs)
  }, [filteredRows, activeWindow.startMs, activeWindow.endMs])

  const userLeaderboard = useMemo(() => {
    const totals = new Map<string, { tokens: number; costUsd: number }>()
    for (const r of windowFilteredRows) {
      const uid = r.userId || 'unattributed'
      const cur = totals.get(uid) || { tokens: 0, costUsd: 0 }
      cur.tokens += Number(r.tokens || 0)
      cur.costUsd += Number(r.costUsd || 0)
      totals.set(uid, cur)
    }
    const rows = Array.from(totals.entries())
      .map(([userId, v]) => ({ userId, ...v }))
      .sort((a, b) => b.tokens - a.tokens)

    const nameFor = (userId: string) => {
      if (userId === 'unattributed') return 'Unattributed'
      const m = members.find((x) => x.userId === userId)
      return m?.displayName || m?.email || userId
    }

    return rows.map((r) => ({
      ...r,
      label: nameFor(r.userId),
      email: members.find((x) => x.userId === r.userId)?.email,
    }))
  }, [windowFilteredRows, members])

  const teamLeaderboard = useMemo(() => {
    const totals = new Map<string, { tokens: number; costUsd: number }>()
    for (const r of windowFilteredRows) {
      const tid = r.teamId || 'unassigned'
      const cur = totals.get(tid) || { tokens: 0, costUsd: 0 }
      cur.tokens += Number(r.tokens || 0)
      cur.costUsd += Number(r.costUsd || 0)
      totals.set(tid, cur)
    }
    const rows = Array.from(totals.entries())
      .map(([teamId, v]) => ({ teamId, ...v }))
      .sort((a, b) => b.tokens - a.tokens)

    const nameFor = (teamId: string) => {
      if (teamId === 'unassigned') return 'Unassigned'
      const t = teams.find((x) => x.id === teamId)
      return t?.name || teamId
    }

    const memberCountFor = (teamId: string) => {
      if (teamId === 'unassigned') return members.filter((m) => !m.teamId).length
      return members.filter((m) => m.teamId === teamId).length
    }

    return rows.map((r) => ({
      ...r,
      label: nameFor(r.teamId),
      memberCount: memberCountFor(r.teamId),
    }))
  }, [windowFilteredRows, teams, members])

  const hasTeamCompetition = teams.length > 1 && selectedTeamId === 'all'

  // Auto-materialize org usage events if the org collection is empty.
  useEffect(() => {
    if (!organization?.id) return
    if (orgLoading || rowsLoading) return
    if (materializeStatus.attempted || materializeStatus.running) return
    if (rows.length > 0) return

    setMaterializeStatus((s) => ({ ...s, attempted: true, running: true, error: null }))
    const fn = httpsCallable(functions, 'materializeOrgUsageEvents')
    void fn({}).then((res) => {
      setMaterializeStatus((s) => ({ ...s, running: false, result: res.data }))
      refresh()
    }).catch((e: any) => {
      setMaterializeStatus((s) => ({ ...s, running: false, error: String(e?.message || e) }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id, orgLoading, rowsLoading, rows.length])

  if (orgLoading || rowsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-300">Join an organization to see org-wide usage analytics.</p>
        </div>
      </div>
    )
  }

  if (user?.tier === 'free_individual') {
    return (
      <div className="p-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">Upgrade to enable org analytics</div>
          <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            Org usage analytics requires saved usage events. Free accounts can upload and analyze locally in “My Usage”,
            but do not sync to the database.
          </div>
        </div>
      </div>
    )
  }

  const visibleMembers = selectedTeamId === 'all'
    ? members
    : members.filter((m) => m.teamId === selectedTeamId)

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Usage Analytics</h1>
        <p className="text-neutral-500 dark:text-gray-400 mt-2">
          Organization-wide usage for {organization.name}
        </p>
      </div>

      {/* Materialization status */}
      {(rowsError || materializeStatus.running || materializeStatus.error) && (
        <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          {rowsError && (
            <div className="text-sm text-red-700 dark:text-red-300">
              Failed to load org usage events: {rowsError}
            </div>
          )}
          {materializeStatus.running && (
            <div className="text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
              Materializing org usage history from member data…
            </div>
          )}
          {materializeStatus.error && (
            <div className="text-sm text-red-700 dark:text-red-300">
              Could not materialize org usage history: {materializeStatus.error}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-2">
              Team
            </div>
            <select
              value={selectedTeamId}
              onChange={(e) => {
                setSelectedTeamId(e.target.value)
                setSelectedUserId('all')
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-2">
              User
            </div>
            <select
              value={selectedUserId}
              onChange={(e) => {
                const newUserId = e.target.value
                setSelectedUserId(newUserId)
                // When going back to "All users", reset team filter that may have
                // been auto-resolved by the useEffect so the user sees all data again.
                if (newUserId === 'all') {
                  setSelectedTeamId('all')
                }
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All users</option>
              {visibleMembers.map((m) => (
                <option key={m.userId} value={m.userId}>{m.displayName || m.email}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-2">
              Streams
            </div>
            <div className="flex flex-wrap gap-2">
              {streamOptions.map((s) => {
                const active = selectedStreamIds.length === 0 || selectedStreamIds.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedStreamIds((prev) => {
                        // Empty array means "All" — switching to explicit set on first toggle.
                        const next = prev.length === 0 ? streamOptions.map((x) => x.id) : [...prev]
                        const has = next.includes(s.id)
                        const updated = has ? next.filter((x) => x !== s.id) : [...next, s.id]
                        // If all are selected, collapse back to "All".
                        const allIds = streamOptions.map((x) => x.id)
                        const allSelected = allIds.every((id) => updated.includes(id))
                        return allSelected ? [] : updated
                      })
                    }}
                    className={[
                      'px-2 py-1 rounded-full text-xs font-medium border transition-colors',
                      active
                        ? 'bg-primary-500/15 border-primary-500 text-gray-900 dark:text-white'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600',
                    ].join(' ')}
                    title={s.label}
                  >
                    {s.label}
                  </button>
                )
              })}
              <div className="text-xs text-gray-500 dark:text-gray-400 self-center">
                {selectedStreamIds.length === 0 ? 'All' : `${selectedStreamIds.length} selected`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold text-gray-900 dark:text-white">Top Users (tokens)</div>
            <button
              type="button"
              onClick={() => setShowAllUsers((v) => !v)}
              className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
            >
              {showAllUsers ? 'Show top 5' : 'View all'}
            </button>
          </div>

          {(showAllUsers ? userLeaderboard : userLeaderboard.slice(0, 5)).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 animate-[fadeIn_0.3s_ease-in-out]">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 mb-2">
                <Users className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">No usage yet in this window</div>
            </div>
          ) : (
            <div className="space-y-2">
              {(showAllUsers ? userLeaderboard : userLeaderboard.slice(0, 5)).map((u, idx) => (
                <div key={u.userId} className="flex items-center justify-between rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900/20">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="w-7 text-xs font-semibold text-gray-500 dark:text-gray-400 tabular-nums">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {u.label}
                      </div>
                      {u.email && (
                        <div className="text-xs text-gray-600 dark:text-gray-300 truncate">{u.email}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                      {formatTokensCompact(u.tokens)}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 tabular-nums">
                      {u.costUsd > 0 ? `$${formatUsd(u.costUsd)}` : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {hasTeamCompetition && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">Top Teams (tokens)</div>
              <button
                type="button"
                onClick={() => setShowAllTeams((v) => !v)}
                className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                {showAllTeams ? 'Show top 5' : 'View all'}
              </button>
            </div>

            {(showAllTeams ? teamLeaderboard : teamLeaderboard.slice(0, 5)).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 animate-[fadeIn_0.3s_ease-in-out]">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 mb-2">
                  <Trophy className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">No team usage yet in this window</div>
              </div>
            ) : (
              <div className="space-y-2">
                {(showAllTeams ? teamLeaderboard : teamLeaderboard.slice(0, 5)).map((t, idx) => (
                  <div key={t.teamId} className="flex items-center justify-between rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-900/20">
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="w-7 text-xs font-semibold text-gray-500 dark:text-gray-400 tabular-nums">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {t.label}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          {t.memberCount} member{t.memberCount === 1 ? '' : 's'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                        {formatTokensCompact(t.tokens)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300 tabular-nums">
                        {t.costUsd > 0 ? `$${formatUsd(t.costUsd)}` : '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart – always render so it doesn't collapse on empty data */}
      {filteredRows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 mb-8">
          {/* Empty state with chart placeholder */}
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Usage Chart</h3>
          </div>
          {/* Maintain chart height so layout doesn't jump */}
          <div className="h-96 w-full flex items-center justify-center border border-dashed border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50/50 dark:bg-gray-900/20">
            <div className="text-center px-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                <SearchX className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-1">
                No usage data available
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                {selectedUserId !== 'all'
                  ? 'This user has no usage data yet. Try selecting a different user or switch back to "All users".'
                  : selectedTeamId !== 'all'
                    ? 'No usage data found for this team. Try selecting a different team or switch to "All teams".'
                    : 'No usage data has been recorded yet. Upload CSV data or set up an API connection to get started.'}
              </div>
            </div>
          </div>
          {/* Empty model breakdown table placeholder */}
          <div className="mt-6 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Model Breakdown</h4>
            <div className="flex flex-col items-center justify-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 mb-3">
                <BarChart3 className="w-6 h-6 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                No model data to display
              </div>
            </div>
          </div>
        </div>
      ) : (
        <CursorUsageChart
          data={filteredRows as any}
          isLoading={rowsLoading || materializeStatus.running}
          onActiveWindowChange={(w) => setActiveWindow(w)}
        />
      )}
    </div>
  )
}


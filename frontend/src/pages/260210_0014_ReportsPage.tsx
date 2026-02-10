import { useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useOrgUsageEvents } from '@/hooks/useOrgUsageEvents'
import { OrgUsageRow } from '@/lib/orgUsageEvents'
import { buildCsv, downloadCsv, exportPdfReport } from '@/lib/260210_0014_reportExports'

function formatTokens(value: number) {
  return Math.round(value).toLocaleString('en-GB')
}

function formatCurrency(value: number) {
  return value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function calculateCostPerMillionOutputTokens(costUsd: number, outputTokens: number) {
  return outputTokens > 0 ? (costUsd / outputTokens) * 1_000_000 : 0
}

function formatPdfNumber(value: number) {
  return Math.round(value).toLocaleString('en-US')
}

function formatPdfUsd(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function toInputDate(ms: number) {
  return new Date(ms).toISOString().slice(0, 10)
}

export default function ReportsPage() {
  const { user } = useAuth()
  const { organization, members, teams, currentMember, loading: orgLoading } = useOrganization()

  const retentionDays = Number((organization as any)?.settings?.dataRetentionDays) || 365
  const baseWindow = useMemo(() => {
    const endMs = Date.now()
    const startMs = endMs - Math.max(1, Math.min(3650, retentionDays)) * 24 * 60 * 60 * 1000
    return { startMs, endMs }
  }, [retentionDays])

  const { rows, loading: rowsLoading, error: rowsError } = useOrgUsageEvents(baseWindow)

  const now = Date.now()
  const [startDate, setStartDate] = useState<string>(toInputDate(now - 30 * 24 * 60 * 60 * 1000))
  const [endDate, setEndDate] = useState<string>(toInputDate(now))
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all')
  const [selectedUserId, setSelectedUserId] = useState<string>('all')

  const hasSenseiPlus = user?.tier === 'team' || user?.tier === 'enterprise'
  const canAccessReports = hasSenseiPlus && (user?.currentRole === 'admin' || user?.currentRole === 'team_manager')

  const teamManagerTeamId = user?.currentRole === 'team_manager' ? currentMember?.teamId || null : null
  const effectiveTeamId = user?.currentRole === 'team_manager'
    ? (teamManagerTeamId || '__no_team__')
    : selectedTeamId

  const startMs = useMemo(() => {
    const parsed = Date.parse(`${startDate}T00:00:00`)
    return Number.isFinite(parsed) ? parsed : null
  }, [startDate])

  const endMs = useMemo(() => {
    const parsed = Date.parse(`${endDate}T23:59:59`)
    return Number.isFinite(parsed) ? parsed : null
  }, [endDate])

  const visibleMembers = useMemo(() => {
    if (user?.currentRole === 'team_manager') {
      if (!teamManagerTeamId) return []
      return members.filter((member) => member.teamId === teamManagerTeamId)
    }
    if (selectedTeamId === 'all') return members
    return members.filter((member) => member.teamId === selectedTeamId)
  }, [members, selectedTeamId, teamManagerTeamId, user?.currentRole])

  const filteredRows = useMemo(() => {
    let out: OrgUsageRow[] = rows

    if (effectiveTeamId !== 'all') {
      out = out.filter((row) => row.teamId === effectiveTeamId)
    }

    if (selectedUserId !== 'all') {
      out = out.filter((row) => row.userId === selectedUserId)
    }

    if (startMs !== null) {
      out = out.filter((row) => row.timestamp >= startMs)
    }

    if (endMs !== null) {
      out = out.filter((row) => row.timestamp <= endMs)
    }

    return out
  }, [rows, effectiveTeamId, selectedUserId, startMs, endMs])

  const reportSummary = useMemo(() => {
    const uniqueUsers = new Set<string>()
    const uniqueTeams = new Set<string>()

    let totalTokens = 0
    let totalCostUsd = 0
    let totalEvents = 0

    for (const row of filteredRows) {
      totalTokens += Number(row.tokens || 0)
      totalCostUsd += Number(row.costUsd || 0)
      totalEvents += 1
      if (row.userId) uniqueUsers.add(row.userId)
      if (row.teamId) uniqueTeams.add(row.teamId)
    }

    return {
      totalTokens,
      totalCostUsd,
      totalEvents,
      activeUsers: uniqueUsers.size,
      activeTeams: uniqueTeams.size,
    }
  }, [filteredRows])

  const teamLeaderboard = useMemo(() => {
    const totals = new Map<string, {
      tokens: number
      costUsd: number
      events: number
      inputTokens: number
      outputTokens: number
      cacheReadTokens: number
      cacheWriteTokens: number
    }>()

    for (const row of filteredRows) {
      const teamId = row.teamId || 'unassigned'
      const breakdown = row.tokenBreakdown
      const inputWithoutCacheWrite = Number(breakdown?.inputWithoutCacheWrite || 0)
      const cacheWriteTokens = Number(breakdown?.inputWithCacheWrite || 0)
      const outputTokens = Number(breakdown?.output || 0)
      const cacheReadTokens = Number(breakdown?.cacheRead || 0)
      const current = totals.get(teamId) || {
        tokens: 0,
        costUsd: 0,
        events: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      }
      current.tokens += Number(row.tokens || 0)
      current.costUsd += Number(row.costUsd || 0)
      current.events += 1
      current.inputTokens += inputWithoutCacheWrite + cacheWriteTokens
      current.outputTokens += outputTokens
      current.cacheReadTokens += cacheReadTokens
      current.cacheWriteTokens += cacheWriteTokens
      totals.set(teamId, current)
    }

    return Array.from(totals.entries())
      .map(([teamId, values]) => {
        const teamName = teamId === 'unassigned'
          ? 'Unassigned'
          : teams.find((team) => team.id === teamId)?.name || teamId
        return {
          teamId,
          teamName,
          tokens: values.tokens,
          costUsd: values.costUsd,
          events: values.events,
          inputTokens: values.inputTokens,
          outputTokens: values.outputTokens,
          cacheReadTokens: values.cacheReadTokens,
          cacheWriteTokens: values.cacheWriteTokens,
        }
      })
      .sort((a, b) => b.tokens - a.tokens)
  }, [filteredRows, teams])

  const memberUsage = useMemo(() => {
    const totals = new Map<string, {
      tokens: number
      costUsd: number
      events: number
      lastActiveMs: number
      inputTokens: number
      outputTokens: number
      cacheReadTokens: number
      cacheWriteTokens: number
    }>()

    for (const row of filteredRows) {
      const userId = row.userId || 'unattributed'
      const breakdown = row.tokenBreakdown
      const inputWithoutCacheWrite = Number(breakdown?.inputWithoutCacheWrite || 0)
      const cacheWriteTokens = Number(breakdown?.inputWithCacheWrite || 0)
      const outputTokens = Number(breakdown?.output || 0)
      const cacheReadTokens = Number(breakdown?.cacheRead || 0)
      const current = totals.get(userId) || {
        tokens: 0,
        costUsd: 0,
        events: 0,
        lastActiveMs: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      }
      current.tokens += Number(row.tokens || 0)
      current.costUsd += Number(row.costUsd || 0)
      current.events += 1
      current.lastActiveMs = Math.max(current.lastActiveMs, Number(row.timestamp || 0))
      current.inputTokens += inputWithoutCacheWrite + cacheWriteTokens
      current.outputTokens += outputTokens
      current.cacheReadTokens += cacheReadTokens
      current.cacheWriteTokens += cacheWriteTokens
      totals.set(userId, current)
    }

    return Array.from(totals.entries())
      .map(([userId, values]) => {
        const member = members.find((m) => m.userId === userId)
        const userName = userId === 'unattributed'
          ? 'Unattributed'
          : member?.displayName || member?.email || userId
        const userEmail = member?.email || '—'
        const teamName = member?.teamId
          ? teams.find((team) => team.id === member.teamId)?.name || member.teamId
          : 'Unassigned'

        return {
          userId,
          userName,
          userEmail,
          teamName,
          tokens: values.tokens,
          costUsd: values.costUsd,
          events: values.events,
          lastActive: values.lastActiveMs ? new Date(values.lastActiveMs).toISOString().slice(0, 10) : '—',
          inputTokens: values.inputTokens,
          outputTokens: values.outputTokens,
          cacheReadTokens: values.cacheReadTokens,
          cacheWriteTokens: values.cacheWriteTokens,
        }
      })
      .sort((a, b) => b.tokens - a.tokens)
  }, [filteredRows, members, teams])

  const modelBreakdown = useMemo(() => {
    const totals = new Map<string, {
      tokens: number
      costUsd: number
      events: number
      inputTokens: number
      outputTokens: number
      cacheReadTokens: number
      cacheWriteTokens: number
    }>()

    for (const row of filteredRows) {
      const model = row.model || 'unknown'
      const breakdown = row.tokenBreakdown
      const inputWithoutCacheWrite = Number(breakdown?.inputWithoutCacheWrite || 0)
      const cacheWriteTokens = Number(breakdown?.inputWithCacheWrite || 0)
      const outputTokens = Number(breakdown?.output || 0)
      const cacheReadTokens = Number(breakdown?.cacheRead || 0)
      const current = totals.get(model) || {
        tokens: 0,
        costUsd: 0,
        events: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      }
      current.tokens += Number(row.tokens || 0)
      current.costUsd += Number(row.costUsd || 0)
      current.events += 1
      current.inputTokens += inputWithoutCacheWrite + cacheWriteTokens
      current.outputTokens += outputTokens
      current.cacheReadTokens += cacheReadTokens
      current.cacheWriteTokens += cacheWriteTokens
      totals.set(model, current)
    }

    return Array.from(totals.entries())
      .map(([model, values]) => ({
        model,
        tokens: values.tokens,
        costUsd: values.costUsd,
        events: values.events,
        inputTokens: values.inputTokens,
        outputTokens: values.outputTokens,
        cacheReadTokens: values.cacheReadTokens,
        cacheWriteTokens: values.cacheWriteTokens,
      }))
      .sort((a, b) => b.tokens - a.tokens)
  }, [filteredRows])

  const dateLabel = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const exportMembersCsv = (filenamePrefix: string) => {
    const teamScopeLabel = effectiveTeamId === 'all'
      ? 'All teams'
      : effectiveTeamId === '__no_team__'
        ? 'No team assigned'
        : teams.find((team) => team.id === effectiveTeamId)?.name || 'Selected team'

    const userScopeLabel = selectedUserId === 'all'
      ? 'All users'
      : members.find((member) => member.userId === selectedUserId)?.displayName || selectedUserId

    const summaryRows = [
      { metric: 'Organization', value: organization?.name || 'Organization' },
      { metric: 'Date Range', value: `${startDate} to ${endDate}` },
      { metric: 'Team Scope', value: teamScopeLabel },
      { metric: 'User Scope', value: userScopeLabel },
      { metric: 'Total Tokens', value: Math.round(reportSummary.totalTokens) },
      { metric: 'Total Cost USD', value: Number(reportSummary.totalCostUsd.toFixed(2)) },
      { metric: 'Usage Events', value: reportSummary.totalEvents },
      { metric: 'Active Users', value: reportSummary.activeUsers },
      { metric: 'Active Teams', value: reportSummary.activeTeams },
    ]

    const summaryCsv = buildCsv(summaryRows, [
      { header: 'Metric', value: (row) => row.metric },
      { header: 'Value', value: (row) => row.value },
    ])

    const teamCsv = buildCsv(teamLeaderboard, [
      { header: 'Rank', value: (row) => teamLeaderboard.findIndex((entry) => entry.teamId === row.teamId) + 1 },
      { header: 'Team', value: (row) => row.teamName },
      { header: 'Total Tokens', value: (row) => Math.round(row.tokens) },
      { header: 'Input Tokens', value: (row) => Math.round(row.inputTokens) },
      { header: 'Output Tokens', value: (row) => Math.round(row.outputTokens) },
      { header: 'Cache Read Tokens', value: (row) => Math.round(row.cacheReadTokens) },
      { header: 'Cache Write Tokens', value: (row) => Math.round(row.cacheWriteTokens) },
      { header: 'Cost USD', value: (row) => Number(row.costUsd.toFixed(2)) },
      { header: 'Usage Events', value: (row) => row.events },
    ])

    const membersCsv = buildCsv(memberUsage, [
      { header: 'User', value: (row) => row.userName },
      { header: 'Email', value: (row) => row.userEmail },
      { header: 'Team', value: (row) => row.teamName },
      { header: 'Total Tokens', value: (row) => Math.round(row.tokens) },
      { header: 'Input Tokens', value: (row) => Math.round(row.inputTokens) },
      { header: 'Output Tokens', value: (row) => Math.round(row.outputTokens) },
      { header: 'Cache Read Tokens', value: (row) => Math.round(row.cacheReadTokens) },
      { header: 'Cache Write Tokens', value: (row) => Math.round(row.cacheWriteTokens) },
      { header: 'Cost USD', value: (row) => Number(row.costUsd.toFixed(2)) },
      { header: 'Usage Events', value: (row) => row.events },
      { header: 'Last Active', value: (row) => row.lastActive },
    ])

    const modelCsv = buildCsv(modelBreakdown, [
      { header: 'Model', value: (row) => row.model },
      { header: 'Input Tokens', value: (row) => Math.round(row.inputTokens) },
      { header: 'Output Tokens', value: (row) => Math.round(row.outputTokens) },
      { header: 'Total Tokens', value: (row) => Math.round(row.tokens) },
      { header: 'Cache Read Tokens', value: (row) => Math.round(row.cacheReadTokens) },
      { header: 'Cost USD', value: (row) => Number(row.costUsd.toFixed(2)) },
      {
        header: 'Cost per 1M Output Tokens (USD)',
        value: (row) => {
          const costPerMillionOutputTokensUsd = calculateCostPerMillionOutputTokens(row.costUsd, row.outputTokens)
          return costPerMillionOutputTokensUsd > 0 ? Number(costPerMillionOutputTokensUsd.toFixed(2)) : ''
        },
      },
      { header: 'Usage Events', value: (row) => row.events },
    ])

    const multiSectionCsv = [
      'REPORT SUMMARY',
      summaryCsv,
      '',
      'TEAM LEADERBOARD',
      teamCsv,
      '',
      'MEMBER USAGE',
      membersCsv,
      '',
      'MODEL BREAKDOWN',
      modelCsv,
    ].join('\n')

    downloadCsv(multiSectionCsv, `${filenamePrefix}_${dateLabel}.csv`)
  }

  const exportPdf = async () => {
    const teamScopeLabel = effectiveTeamId === 'all'
      ? 'All teams'
      : effectiveTeamId === '__no_team__'
        ? 'No team assigned'
      : teams.find((team) => team.id === effectiveTeamId)?.name || 'Selected team'

    const userScopeLabel = selectedUserId === 'all'
      ? 'All users'
      : members.find((member) => member.userId === selectedUserId)?.displayName || selectedUserId

    await exportPdfReport({
      filename: `usage_report_${dateLabel}.pdf`,
      title: 'Usage Report',
      subtitle: `${organization?.name || 'Organization'} | ${teamScopeLabel} | ${userScopeLabel}`,
      generatedAt: new Date().toLocaleString(),
      dateRangeLabel: `${startDate} to ${endDate}`,
      scopeLabel: `${teamScopeLabel} | ${userScopeLabel}`,
      organizationName: organization?.name || 'Organization',
      summary: [
        { label: 'Total tokens', value: formatTokens(reportSummary.totalTokens) },
        { label: 'Total cost (USD)', value: `$${formatCurrency(reportSummary.totalCostUsd)}` },
        { label: 'Usage events', value: String(reportSummary.totalEvents) },
        { label: 'Active users', value: String(reportSummary.activeUsers) },
      ],
      tables: [
        {
          title: 'Team Leaderboard',
          columns: ['Rank', 'Team', 'Tokens', 'Cost (USD)', 'Events'],
          rows: teamLeaderboard.slice(0, 20).map((row, index) => ([
            index + 1,
            row.teamName,
            formatPdfNumber(row.tokens),
            formatPdfUsd(row.costUsd),
            formatPdfNumber(row.events),
          ])),
        },
        {
          title: 'Member Usage',
          columns: ['User', 'Team', 'Tokens', 'Cost (USD)', 'Events', 'Last Active'],
          rows: memberUsage.slice(0, 40).map((row) => ([
            row.userName,
            row.teamName,
            formatPdfNumber(row.tokens),
            formatPdfUsd(row.costUsd),
            formatPdfNumber(row.events),
            row.lastActive,
          ])),
        },
        {
          title: 'Model Breakdown',
          columns: ['Model', 'Input Tokens', 'Output Tokens', 'Total Tokens', 'Cache Read Tokens', 'Cost (USD)', 'Cost / 1M Output (USD)', 'Events'],
          rows: modelBreakdown.slice(0, 25).map((row) => ([
            row.model,
            formatPdfNumber(row.inputTokens),
            formatPdfNumber(row.outputTokens),
            formatPdfNumber(row.tokens),
            formatPdfNumber(row.cacheReadTokens),
            formatPdfUsd(row.costUsd),
            (() => {
              const costPerMillionOutputTokensUsd = calculateCostPerMillionOutputTokens(row.costUsd, row.outputTokens)
              return costPerMillionOutputTokensUsd > 0 ? formatPdfUsd(costPerMillionOutputTokensUsd) : '—'
            })(),
            formatPdfNumber(row.events),
          ])),
        },
      ],
    })
  }

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
          <p className="text-gray-600 dark:text-gray-300">Join an organization to access team reports.</p>
        </div>
      </div>
    )
  }

  if (!canAccessReports) {
    return (
      <div className="p-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">Reports are available on Sensei and above</div>
          <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            This area is limited to paid team plans (`team` / `enterprise`) and admin or team manager roles.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Reports</h1>
          <p className="text-neutral-500 dark:text-gray-400 mt-2">
            Team and member usage reports for {organization.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportMembersCsv('usage_report')}
            className="px-3 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => exportMembersCsv('usage_report_excel')}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-100 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Export Excel (CSV)
          </button>
          <button
            type="button"
            onClick={() => void exportPdf()}
            className="px-3 py-2 rounded-lg bg-secondary-900 text-white text-sm font-medium hover:bg-secondary-800"
          >
            Export PDF
          </button>
        </div>
      </div>

      {rowsError && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-300">
          Failed to load usage report data: {rowsError}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-2">Date from</div>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-2">Date to</div>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-2">Team</div>
            {teamManagerTeamId ? (
              <div className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-100">
                {teams.find((team) => team.id === teamManagerTeamId)?.name || 'No team assigned'}
              </div>
            ) : (
              <select
                value={selectedTeamId}
                onChange={(event) => {
                  setSelectedTeamId(event.target.value)
                  setSelectedUserId('all')
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-2">User</div>
            <select
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All users</option>
              {visibleMembers.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.displayName || member.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total tokens</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{formatTokens(reportSummary.totalTokens)}</div>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total cost (USD)</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">${formatCurrency(reportSummary.totalCostUsd)}</div>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Usage events</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{reportSummary.totalEvents.toLocaleString('en-GB')}</div>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Active users</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{reportSummary.activeUsers.toLocaleString('en-GB')}</div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Team Leaderboard</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Team</th>
                <th className="py-2 pr-4">Tokens</th>
                <th className="py-2 pr-4">Cost (USD)</th>
                <th className="py-2 pr-4">Events</th>
              </tr>
            </thead>
            <tbody>
              {teamLeaderboard.slice(0, 20).map((row, index) => (
                <tr key={row.teamId} className="border-b border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                  <td className="py-2 pr-4">{index + 1}</td>
                  <td className="py-2 pr-4">{row.teamName}</td>
                  <td className="py-2 pr-4">{formatTokens(row.tokens)}</td>
                  <td className="py-2 pr-4">${formatCurrency(row.costUsd)}</td>
                  <td className="py-2 pr-4">{row.events.toLocaleString('en-GB')}</td>
                </tr>
              ))}
              {teamLeaderboard.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-500 dark:text-gray-400">No team usage in this date range.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Member Usage</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                <th className="py-2 pr-4">User</th>
                <th className="py-2 pr-4">Team</th>
                <th className="py-2 pr-4">Tokens</th>
                <th className="py-2 pr-4">Cost (USD)</th>
                <th className="py-2 pr-4">Events</th>
                <th className="py-2 pr-4">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {memberUsage.slice(0, 50).map((row) => (
                <tr key={row.userId} className="border-b border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                  <td className="py-2 pr-4">{row.userName}</td>
                  <td className="py-2 pr-4">{row.teamName}</td>
                  <td className="py-2 pr-4">{formatTokens(row.tokens)}</td>
                  <td className="py-2 pr-4">${formatCurrency(row.costUsd)}</td>
                  <td className="py-2 pr-4">{row.events.toLocaleString('en-GB')}</td>
                  <td className="py-2 pr-4">{row.lastActive}</td>
                </tr>
              ))}
              {memberUsage.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500 dark:text-gray-400">No member usage in this date range.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Model Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                <th className="py-2 pr-4">Model</th>
                <th className="py-2 pr-4">Input Tokens</th>
                <th className="py-2 pr-4">Output Tokens</th>
                <th className="py-2 pr-4">Total Tokens</th>
                <th className="py-2 pr-4">Cache Read Tokens</th>
                <th className="py-2 pr-4">Cost (USD)</th>
                <th className="py-2 pr-4">Cost / 1M Output (USD)</th>
                <th className="py-2 pr-4">Events</th>
              </tr>
            </thead>
            <tbody>
              {modelBreakdown.slice(0, 30).map((row) => (
                <tr key={row.model} className="border-b border-gray-100 dark:border-gray-800 text-gray-900 dark:text-gray-100">
                  <td className="py-2 pr-4">{row.model}</td>
                  <td className="py-2 pr-4">{formatTokens(row.inputTokens)}</td>
                  <td className="py-2 pr-4">{formatTokens(row.outputTokens)}</td>
                  <td className="py-2 pr-4">{formatTokens(row.tokens)}</td>
                  <td className="py-2 pr-4">{formatTokens(row.cacheReadTokens)}</td>
                  <td className="py-2 pr-4">${formatCurrency(row.costUsd)}</td>
                  <td className="py-2 pr-4">
                    {(() => {
                      const costPerMillionOutputTokensUsd = calculateCostPerMillionOutputTokens(row.costUsd, row.outputTokens)
                      return costPerMillionOutputTokensUsd > 0 ? `$${formatCurrency(costPerMillionOutputTokensUsd)}` : '—'
                    })()}
                  </td>
                  <td className="py-2 pr-4">{row.events.toLocaleString('en-GB')}</td>
                </tr>
              ))}
              {modelBreakdown.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-gray-500 dark:text-gray-400">No model usage in this date range.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

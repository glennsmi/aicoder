import { useEffect, useMemo, useState } from 'react'
import { useOrganization } from '@/contexts/OrganizationContext'
import { getOrgUsageEventsV2, OrgUsageRow } from '@/lib/orgUsageEvents'

type WindowMs = { startMs: number; endMs: number }

export function useOrgUsageEvents(windowMs: WindowMs | null) {
  const { organization } = useOrganization()
  const [rows, setRows] = useState<OrgUsageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  const orgId = organization?.id ?? null

  const key = useMemo(() => {
    if (!orgId) return 'no-org'
    const s = windowMs?.startMs ?? 0
    const e = windowMs?.endMs ?? 0
    return `${orgId}:${s}:${e}:${refreshToken}`
  }, [orgId, windowMs?.startMs, windowMs?.endMs, refreshToken])

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!orgId) {
        setRows([])
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const data = await getOrgUsageEventsV2(orgId, {
          startMs: windowMs?.startMs,
          endMs: windowMs?.endMs,
          limitCount: 10000,
        })
        if (cancelled) return
        setRows(data)
      } catch (e: any) {
        if (cancelled) return
        setError(String(e?.message || e))
        setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { rows, loading, error, refresh: () => setRefreshToken((x) => x + 1) }
}


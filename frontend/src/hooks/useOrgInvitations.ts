import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { Invitation, InvitationStatus } from '@shared'
import { db } from '../config/firebaseApp'

export function useOrgInvitations(organizationId: string | null | undefined, status?: InvitationStatus) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const q = useMemo(() => {
    if (!organizationId) return null
    const base = collection(db, 'invitations')
    // Avoid composite-index requirements by querying orgId only and filtering client-side.
    // (organizationId == X) is a single-field index; adding status==pending often requires a composite index.
    return query(base, where('organizationId', '==', organizationId))
  }, [organizationId, status])

  const toMillis = (v: any): number => {
    if (!v) return 0
    if (typeof v.toMillis === 'function') return v.toMillis()
    if (typeof v.toDate === 'function') return v.toDate().getTime()
    if (v instanceof Date) return v.getTime()
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }

  useEffect(() => {
    if (!q) {
      setInvitations([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const unsub = onSnapshot(
      q,
      (snap) => {
        let list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Invitation[]
        if (status) {
          list = list.filter((i: any) => i.status === status)
        }
        list.sort((a: any, b: any) => toMillis(b.updatedAt) - toMillis(a.updatedAt))
        setInvitations(list)
        setLoading(false)
      },
      (err) => {
        console.error('Invitations listener error:', err)
        setError(err.message || 'Failed to load invitations')
        setLoading(false)
      }
    )

    return () => unsub()
  }, [q])

  return { invitations, loading, error }
}


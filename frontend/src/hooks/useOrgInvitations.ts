import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { Invitation, InvitationStatus } from '@shared'
import { db } from '../config/firebaseApp'

export function useOrgInvitations(organizationId: string | null | undefined, status?: InvitationStatus) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const q = useMemo(() => {
    if (!organizationId) return null
    const base = collection(db, 'invitations')
    const clauses: any[] = [where('organizationId', '==', organizationId)]
    if (status) clauses.push(where('status', '==', status))
    clauses.push(orderBy('updatedAt', 'desc'))
    return query(base, ...clauses)
  }, [organizationId, status])

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
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Invitation[]
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


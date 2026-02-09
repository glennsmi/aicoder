import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebaseApp'
import { useOrganization } from '../contexts/OrganizationContext'

export default function OrganizationSettingsPage() {
  const navigate = useNavigate()
  const { organization, currentRole, organizationLoading, refreshOrganization } = useOrganization()

  const canEdit = currentRole === 'admin'

  const initial = useMemo(() => {
    return {
      name: organization?.name || '',
      allowMemberInvites: organization?.settings?.allowMemberInvites ?? true,
      requireTwoFactor: organization?.settings?.requireTwoFactor ?? false,
      dataRetentionDays: organization?.settings?.dataRetentionDays ?? 90,
      whiteLabelBranding: organization?.settings?.reports?.whiteLabelBranding ?? false,
    }
  }, [organization])

  const [name, setName] = useState(initial.name)
  const [allowMemberInvites, setAllowMemberInvites] = useState(initial.allowMemberInvites)
  const [requireTwoFactor, setRequireTwoFactor] = useState(initial.requireTwoFactor)
  const [dataRetentionDays, setDataRetentionDays] = useState<number>(initial.dataRetentionDays)
  const [whiteLabelBranding, setWhiteLabelBranding] = useState<boolean>(initial.whiteLabelBranding)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setName(initial.name)
    setAllowMemberInvites(initial.allowMemberInvites)
    setRequireTwoFactor(initial.requireTwoFactor)
    setDataRetentionDays(initial.dataRetentionDays)
    setWhiteLabelBranding(initial.whiteLabelBranding)
  }, [initial])

  const onSave = async () => {
    if (!organization) return
    if (!canEdit) return

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Organization name is required.')
      setSuccess(null)
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      await updateDoc(doc(db, 'organizations', organization.id), {
        name: trimmedName,
        settings: {
          ...organization.settings,
          allowMemberInvites,
          requireTwoFactor,
          dataRetentionDays,
          reports: {
            ...(organization.settings?.reports || {}),
            whiteLabelBranding,
          },
        },
        updatedAt: serverTimestamp()
      })

      await refreshOrganization()
      setSuccess('Saved.')
    } catch (e: any) {
      console.error('Failed to update organization settings:', e)
      setError(e?.message || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  if (organizationLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
        <div className="animate-pulse h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gunmetal-900 dark:text-white">Organization Settings</h1>
        <p className="text-gunmetal-600 dark:text-gray-400 mt-2">
          You’re not currently in an organization.
        </p>
        <button
          onClick={() => navigate('/create-organization')}
          className="mt-6 px-4 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors"
        >
          Create an organization
        </button>
      </div>
    )
  }

  if (!canEdit) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gunmetal-900 dark:text-white">Organization Settings</h1>
        <p className="text-gunmetal-600 dark:text-gray-400 mt-2">
          Only organization admins can edit settings.
        </p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gunmetal-900 dark:text-white">Organization Settings</h1>
        <p className="text-gunmetal-600 dark:text-gray-400 mt-2">
          Basic organization configuration.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gunmetal-900 dark:text-white mb-2">
            Organization name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gunmetal-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="e.g. Acme Engineering"
          />
          <p className="text-xs text-gunmetal-500 dark:text-gray-500 mt-2">
            This is shown to all members in the app and emails.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
            <p className="text-xs uppercase tracking-wide text-gunmetal-500 dark:text-gray-500 font-semibold">
              Tier
            </p>
            <p className="mt-1 text-sm font-semibold text-gunmetal-900 dark:text-white capitalize">
              {organization.tier}
            </p>
          </div>
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
            <p className="text-xs uppercase tracking-wide text-gunmetal-500 dark:text-gray-500 font-semibold">
              Owner
            </p>
            <p className="mt-1 text-sm font-mono text-gunmetal-900 dark:text-white break-all">
              {organization.ownerId}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
          <h2 className="text-lg font-semibold text-gunmetal-900 dark:text-white">
            Member & security
          </h2>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allowMemberInvites}
              onChange={(e) => setAllowMemberInvites(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <div>
              <p className="text-sm font-semibold text-gunmetal-900 dark:text-white">Allow member invites</p>
              <p className="text-xs text-gunmetal-600 dark:text-gray-400">
                If enabled, members can invite others to the organization (subject to role/permissions).
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={requireTwoFactor}
              onChange={(e) => setRequireTwoFactor(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <div>
              <p className="text-sm font-semibold text-gunmetal-900 dark:text-white">Require two-factor auth</p>
              <p className="text-xs text-gunmetal-600 dark:text-gray-400">
                Placeholder setting for future enforcement (UI only right now).
              </p>
            </div>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gunmetal-900 dark:text-white mb-2">
                Data retention (days)
              </label>
              <input
                type="number"
                min={1}
                value={dataRetentionDays}
                onChange={(e) => setDataRetentionDays(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gunmetal-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gunmetal-500 dark:text-gray-500 mt-2">
                How long to retain usage data for this organization.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
          <h2 className="text-lg font-semibold text-gunmetal-900 dark:text-white">
            Reports
          </h2>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={whiteLabelBranding}
              onChange={(e) => setWhiteLabelBranding(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
            />
            <div>
              <p className="text-sm font-semibold text-gunmetal-900 dark:text-white">
                White-label branding on exported reports
              </p>
              <p className="text-xs text-gunmetal-600 dark:text-gray-400">
                When enabled, exported charts/reports will show your organization branding. When disabled, they’ll use Fueld branding.
              </p>
            </div>
          </label>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-400">
            {success}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => navigate('/billing')}
            className="text-sm font-semibold text-gunmetal-700 dark:text-gray-300 hover:underline"
          >
            Back to billing
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 bg-primary-500 text-gunmetal-900 font-semibold rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}


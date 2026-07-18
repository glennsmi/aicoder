import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, doc, getDocs, query as fsQuery, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, functions, storage } from '../config/firebaseApp'
import { useOrganization } from '../contexts/OrganizationContext'
import { useAuth } from '../contexts/AuthContext'

const SUPPORTED_LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const
const MAX_LOGO_BYTES = 5 * 1024 * 1024

function toMillisSafe(value: any): number {
  if (!value) return 0
  if (typeof value?.toMillis === 'function') return value.toMillis()
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function getRetentionUpgradePrompt(retentionDays: number): string {
  if (retentionDays < 0) return 'Your plan already includes unlimited retention.'
  if (retentionDays >= 365) return 'Need longer retention? Upgrade to Enterprise for unlimited retention.'
  if (retentionDays >= 180) return 'Need longer retention? Upgrade to Master for up to 365 days of retention.'
  return 'Need longer retention? Upgrade to Sensei for up to 180 days of retention.'
}

export default function OrganizationSettingsPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { organization, currentRole, organizationLoading, refreshOrganization } = useOrganization()

  const canEdit = currentRole === 'admin'

  const initial = useMemo(() => {
    return {
      name: organization?.name || '',
      allowMemberInvites: organization?.settings?.allowMemberInvites ?? true,
      requireTwoFactor: organization?.settings?.requireTwoFactor ?? false,
      whiteLabelBranding: organization?.settings?.reports?.whiteLabelBranding ?? false,
    }
  }, [organization])

  const [name, setName] = useState(initial.name)
  const [allowMemberInvites, setAllowMemberInvites] = useState(initial.allowMemberInvites)
  const [requireTwoFactor, setRequireTwoFactor] = useState(initial.requireTwoFactor)
  const [whiteLabelBranding, setWhiteLabelBranding] = useState<boolean>(initial.whiteLabelBranding)
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [openingBillingPortal, setOpeningBillingPortal] = useState(false)
  const [subscriptionInternalTier, setSubscriptionInternalTier] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const hasSenseiPlusSubscription = subscriptionInternalTier === 'team_sensei'
    || subscriptionInternalTier === 'team_master'
    || subscriptionInternalTier === 'enterprise'
  const hasSenseiPlusRetentionFallback = Number(organization?.settings?.dataRetentionDays || 0) >= 180
  const hasSenseiPlusFeature = Boolean(hasSenseiPlusSubscription || hasSenseiPlusRetentionFallback || organization?.tier === 'enterprise')
  const retentionDays = Number(organization?.settings?.dataRetentionDays || 90)
  const retentionDisplay = retentionDays < 0 ? 'Unlimited' : `${retentionDays} days`
  const showRetentionUpgradeAction = retentionDays >= 0
  const currentLogoUrl = typeof organization?.settings?.branding?.logoUrl === 'string'
    ? organization.settings.branding.logoUrl
    : null

  useEffect(() => {
    setName(initial.name)
    setAllowMemberInvites(initial.allowMemberInvites)
    setRequireTwoFactor(initial.requireTwoFactor)
    setWhiteLabelBranding(initial.whiteLabelBranding)
  }, [initial])

  useEffect(() => {
    if (!organization?.id) {
      setSubscriptionInternalTier(null)
      return
    }

    const run = async () => {
      try {
        const subscriptionsRef = collection(db, 'subscriptions')
        const subQuery = fsQuery(subscriptionsRef, where('organizationId', '==', organization.id))
        const snapshot = await getDocs(subQuery)
        const activeStatuses = new Set(['active', 'trialing', 'past_due'])
        const docs = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) }))
          .filter((sub: any) => activeStatuses.has(String(sub.status || '')))
          .sort((a: any, b: any) => {
            const aTs = toMillisSafe(a.updatedAt) || toMillisSafe(a.currentPeriodEnd)
            const bTs = toMillisSafe(b.updatedAt) || toMillisSafe(b.currentPeriodEnd)
            return bTs - aTs
          })

        if (docs.length > 0) {
          const current = docs[0] as any
          setSubscriptionInternalTier(String(current.internalTier || current.tier || ''))
        } else {
          setSubscriptionInternalTier(null)
        }
      } catch (subscriptionError) {
        console.warn('Failed to read subscription tier in Organization Settings:', subscriptionError)
        setSubscriptionInternalTier(null)
      }
    }

    run()
  }, [organization?.id])

  const onUploadLogo = async () => {
    if (!organization || !currentUser) return
    if (!canEdit || !hasSenseiPlusFeature) return

    if (!selectedLogo) {
      setError('Choose a logo image to upload.')
      setSuccess(null)
      return
    }

    if (!(SUPPORTED_LOGO_MIME_TYPES as readonly string[]).includes(selectedLogo.type)) {
      setError('Unsupported file type. Please use PNG, JPG/JPEG, WebP, or GIF.')
      setSuccess(null)
      return
    }

    if (selectedLogo.size > MAX_LOGO_BYTES) {
      setError('Image is too large. Please use an image under 5MB.')
      setSuccess(null)
      return
    }

    try {
      setUploadingLogo(true)
      setError(null)
      setSuccess(null)

      const objectPath = `users/${currentUser.uid}/orgLogos/${organization.id}/${Date.now()}_${selectedLogo.name}`
      const objectRef = ref(storage, objectPath)
      await uploadBytes(objectRef, selectedLogo, { contentType: selectedLogo.type })
      const logoUrl = await getDownloadURL(objectRef)

      await updateDoc(doc(db, 'organizations', organization.id), {
        settings: {
          ...organization.settings,
          branding: {
            ...(organization.settings?.branding || {}),
            logoUrl,
            logoPath: objectPath,
          },
        },
        updatedAt: serverTimestamp(),
      })

      setSelectedLogo(null)
      await refreshOrganization()
      setSuccess('Organization logo uploaded.')
    } catch (e: any) {
      console.error('Failed to upload organization logo:', e)
      setError(e?.message || 'Failed to upload logo.')
    } finally {
      setUploadingLogo(false)
    }
  }

  const onRemoveLogo = async () => {
    if (!organization) return
    if (!canEdit || !hasSenseiPlusFeature) return

    try {
      setUploadingLogo(true)
      setError(null)
      setSuccess(null)

      await updateDoc(doc(db, 'organizations', organization.id), {
        settings: {
          ...organization.settings,
          branding: {
            ...(organization.settings?.branding || {}),
            logoUrl: null,
            logoPath: null,
          },
        },
        updatedAt: serverTimestamp(),
      })

      setSelectedLogo(null)
      await refreshOrganization()
      setSuccess('Organization logo removed.')
    } catch (e: any) {
      console.error('Failed to remove organization logo:', e)
      setError(e?.message || 'Failed to remove logo.')
    } finally {
      setUploadingLogo(false)
    }
  }

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

  const onUpgradeRetention = async () => {
    if (!currentUser) return

    try {
      setOpeningBillingPortal(true)
      setError(null)
      setSuccess(null)

      const createPortalSession = httpsCallable(functions, 'createBillingPortalSession')
      const result = await createPortalSession({ returnUrl: window.location.href })
      const data = result.data as { success?: boolean; url?: string }

      if (!data?.success || !data?.url) {
        throw new Error('Unable to open Stripe billing portal right now.')
      }

      window.location.href = data.url
    } catch (e: any) {
      console.error('Failed to open billing portal for retention upgrade:', e)
      setError(e?.message || 'Failed to open Stripe billing portal.')
      setOpeningBillingPortal(false)
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

          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
            <p className="text-sm font-semibold text-gunmetal-900 dark:text-white">
              Data retention
            </p>
            <p className="mt-1 text-sm text-gunmetal-700 dark:text-gray-300">
              {retentionDisplay}
            </p>
            <p className="text-xs text-gunmetal-500 dark:text-gray-500 mt-2">
              Data retention is managed by your subscription tier.
            </p>
            {showRetentionUpgradeAction && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="text-xs text-gunmetal-600 dark:text-gray-400">
                  {getRetentionUpgradePrompt(retentionDays)}
                </p>
                <button
                  type="button"
                  onClick={onUpgradeRetention}
                  disabled={openingBillingPortal}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {openingBillingPortal ? 'Opening Stripe…' : 'Upgrade retention in Stripe'}
                </button>
              </div>
            )}
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

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
          <h2 className="text-lg font-semibold text-gunmetal-900 dark:text-white">
            Branding
          </h2>

          {hasSenseiPlusFeature ? (
            <>
              <p className="text-xs text-gunmetal-600 dark:text-gray-400">
                Upload your company logo to white-label the top-left app branding for your organization.
              </p>

              {currentLogoUrl ? (
                <div className="flex items-center gap-3">
                  <img
                    src={currentLogoUrl}
                    alt={`${organization.name} logo`}
                    className="h-10 w-auto max-w-[180px] rounded bg-white/80 p-1 border border-gray-200 dark:border-gray-700"
                  />
                  <span className="text-xs text-gunmetal-500 dark:text-gray-500">Current logo</span>
                </div>
              ) : (
                <p className="text-xs text-gunmetal-500 dark:text-gray-500">No logo uploaded yet.</p>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="file"
                  accept={SUPPORTED_LOGO_MIME_TYPES.join(',')}
                  onChange={(e) => setSelectedLogo(e.target.files?.[0] || null)}
                  className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-secondary-100 file:text-gunmetal-900 hover:file:bg-secondary-200 dark:file:bg-white/10 dark:file:text-white dark:hover:file:bg-white/15"
                />
                <button
                  onClick={onUploadLogo}
                  disabled={uploadingLogo}
                  className="px-4 py-2 rounded-lg bg-primary-500 text-gunmetal-900 font-semibold text-sm hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload logo
                </button>
                <button
                  onClick={onRemoveLogo}
                  disabled={uploadingLogo || !currentLogoUrl}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gunmetal-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Remove logo
                </button>
              </div>
              <p className="text-xs text-gunmetal-500 dark:text-gray-500">
                Supported: PNG, JPG/JPEG, WebP, GIF (max 5MB).
              </p>
            </>
          ) : (
            <p className="text-sm text-gunmetal-600 dark:text-gray-400">
              Custom logo upload is available on Sensei, Master, and Grandmaster plans.
            </p>
          )}
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


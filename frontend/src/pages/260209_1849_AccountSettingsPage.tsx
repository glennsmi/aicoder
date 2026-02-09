import { useMemo, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { updateProfile, verifyBeforeUpdateEmail } from 'firebase/auth'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { auth, db, functions, storage } from '@/config/firebaseApp'

type UiStatus = { type: 'success' | 'error' | 'info'; message: string } | null

const SUPPORTED_AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const
const MAX_AVATAR_BYTES = 5 * 1024 * 1024

export default function AccountSettingsPage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [newEmail, setNewEmail] = useState<string>('')
  const [clearConfirm, setClearConfirm] = useState<string>('')
  const [busy, setBusy] = useState<{ photo?: boolean; email?: boolean; clearEnable?: boolean; clear?: boolean }>({})
  const [status, setStatus] = useState<UiStatus>(null)

  const displayName = currentUser?.displayName || 'User'
  const email = currentUser?.email || ''

  const avatarUrl = useMemo(() => {
    const u = (currentUser?.photoURL || '').trim()
    return u.length > 0 ? u : null
  }, [currentUser?.photoURL])

  if (!currentUser) return null

  const uploadProfilePhoto = async () => {
    setBusy((b) => ({ ...b, photo: true }))
    setStatus(null)
    try {
      if (!selectedPhoto) {
        setStatus({ type: 'error', message: 'Choose an image to upload.' })
        return
      }

      if (!(SUPPORTED_AVATAR_MIME_TYPES as readonly string[]).includes(selectedPhoto.type)) {
        setStatus({
          type: 'error',
          message: 'Unsupported file type. Please use PNG, JPG/JPEG, WebP, or GIF.',
        })
        return
      }

      if (selectedPhoto.size > MAX_AVATAR_BYTES) {
        setStatus({ type: 'error', message: 'Image is too large. Please use an image under 5MB.' })
        return
      }

      // Store under user-owned path. We include a timestamp to avoid caching issues.
      const objectPath = `users/${currentUser.uid}/avatar/${Date.now()}_${selectedPhoto.name}`
      const objectRef = ref(storage, objectPath)
      await uploadBytes(objectRef, selectedPhoto, { contentType: selectedPhoto.type })
      const url = await getDownloadURL(objectRef)

      await updateProfile(currentUser, { photoURL: url })

      // Keep a copy in Firestore too (useful for non-auth contexts)
      await setDoc(
        doc(db, 'users', currentUser.uid),
        { profileImageUrl: url, profileImagePath: objectPath, updatedAt: serverTimestamp() },
        { merge: true }
      )

      setSelectedPhoto(null)
      setStatus({ type: 'success', message: 'Profile image uploaded.' })
    } catch (e: any) {
      setStatus({ type: 'error', message: String(e?.message || 'Failed to update profile image.') })
    } finally {
      setBusy((b) => ({ ...b, photo: false }))
    }
  }

  const removeProfilePhoto = async () => {
    setBusy((b) => ({ ...b, photo: true }))
    setStatus(null)
    try {
      // Best-effort delete of stored image if we know its path.
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid))
        const data: any = snap.exists() ? snap.data() : null
        const path = typeof data?.profileImagePath === 'string' ? data.profileImagePath : null
        if (path) {
          await deleteObject(ref(storage, path))
        }
      } catch {
        // ignore storage cleanup failures (we still clear profile)
      }

      await updateProfile(currentUser, { photoURL: null })
      await setDoc(
        doc(db, 'users', currentUser.uid),
        { profileImageUrl: null, profileImagePath: null, updatedAt: serverTimestamp() },
        { merge: true }
      )
      setSelectedPhoto(null)
      setStatus({ type: 'success', message: 'Profile image removed.' })
    } catch (e: any) {
      setStatus({ type: 'error', message: String(e?.message || 'Failed to remove profile image.') })
    } finally {
      setBusy((b) => ({ ...b, photo: false }))
    }
  }

  const requestEmailChange = async () => {
    setBusy((b) => ({ ...b, email: true }))
    setStatus(null)
    try {
      const target = newEmail.trim()
      if (!target) {
        setStatus({ type: 'error', message: 'Enter an email address.' })
        return
      }

      // This is the most secure approach: sends a verification link to the new email
      // and only updates the account email after verification.
      await verifyBeforeUpdateEmail(currentUser, target, {
        url: `${window.location.origin}/login`,
      })

      setStatus({
        type: 'success',
        message: `Verification email sent to ${target}. Open that email to confirm the change.`,
      })
      setNewEmail('')
    } catch (e: any) {
      const msg = String(e?.message || e?.code || 'Failed to start email change.')
      // Common: requires-recent-login. We keep UX simple: ask them to sign out/in.
      if (String(e?.code) === 'auth/requires-recent-login') {
        setStatus({
          type: 'error',
          message: 'For security, please sign out and sign back in, then retry changing your email.',
        })
      } else {
        setStatus({ type: 'error', message: msg })
      }
    } finally {
      setBusy((b) => ({ ...b, email: false }))
    }
  }

  const enableClearDataWindow = async () => {
    setBusy((b) => ({ ...b, clearEnable: true }))
    setStatus(null)
    try {
      await setDoc(
        doc(db, 'users', currentUser.uid),
        {
          settings: {
            experimental: {
              clearDataEnabledAt: serverTimestamp(),
            },
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
      setStatus({
        type: 'info',
        message: 'Clear-data enabled for 15 minutes. You still need to type CLEAR and confirm below.',
      })
    } catch (e: any) {
      setStatus({ type: 'error', message: String(e?.message || 'Failed to enable clear-data.') })
    } finally {
      setBusy((b) => ({ ...b, clearEnable: false }))
    }
  }

  const clearMyData = async () => {
    setBusy((b) => ({ ...b, clear: true }))
    setStatus(null)
    try {
      const confirm = clearConfirm.trim().toUpperCase()
      if (confirm !== 'CLEAR') {
        setStatus({ type: 'error', message: 'Type CLEAR to confirm.' })
        return
      }

      if (!auth.currentUser) {
        setStatus({ type: 'error', message: 'You must be signed in.' })
        return
      }

      const fn = httpsCallable(functions, 'clearMyData')
      const result = await fn({ confirm: 'CLEAR' })
      const summary = (result.data as any)?.summary
      setStatus({
        type: 'success',
        message: summary ? `Data cleared. ${summary}` : 'Data cleared.',
      })
      setClearConfirm('')
    } catch (e: any) {
      setStatus({ type: 'error', message: String(e?.message || e?.code || 'Failed to clear data.') })
    } finally {
      setBusy((b) => ({ ...b, clear: false }))
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gunmetal-900 dark:text-white">Account Settings</h1>
          <p className="text-sm text-gunmetal-600 dark:text-white/70 mt-1">
            Manage your email, profile image, and experimental data tools.
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-white/20 text-sm text-gunmetal-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
        >
          Back
        </button>
      </div>

      {status && (
        <div
          className={[
            'mt-4 rounded-lg px-4 py-3 text-sm border',
            status.type === 'success' ? 'bg-green-50 border-green-200 text-green-900' : '',
            status.type === 'error' ? 'bg-red-50 border-red-200 text-red-900' : '',
            status.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-900' : '',
          ].join(' ')}
        >
          {status.message}
        </div>
      )}

      {/* Profile */}
      <section className="mt-6 bg-white dark:bg-secondary-900 rounded-xl border border-gray-200 dark:border-white/10 p-5">
        <h2 className="text-lg font-semibold text-gunmetal-900 dark:text-white">Profile</h2>

        <div className="mt-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-accent-400 flex items-center justify-center overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-neutral-900 font-bold text-lg">{email?.[0]?.toUpperCase() || 'U'}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gunmetal-900 dark:text-white truncate">{displayName}</div>
            <div className="text-xs text-gunmetal-600 dark:text-white/60 truncate">{email}</div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-gunmetal-700 dark:text-white/70 mb-2">
            Profile image
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="file"
              accept={SUPPORTED_AVATAR_MIME_TYPES.join(',')}
              onChange={(e) => setSelectedPhoto(e.target.files?.[0] || null)}
              className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-secondary-100 file:text-gunmetal-900 hover:file:bg-secondary-200 dark:file:bg-white/10 dark:file:text-white dark:hover:file:bg-white/15"
            />
            <button
              onClick={uploadProfilePhoto}
              disabled={Boolean(busy.photo)}
              className="px-4 py-2 rounded-lg bg-accent-400 text-neutral-900 font-semibold text-sm hover:opacity-90 disabled:opacity-50"
            >
              Upload
            </button>
            <button
              onClick={removeProfilePhoto}
              disabled={Boolean(busy.photo)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/20 text-sm text-gunmetal-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
          <p className="text-xs text-gunmetal-500 dark:text-white/50 mt-2">
            Supported: PNG, JPG/JPEG, WebP, GIF (max 5MB). We store it in Firebase Storage and update your Auth profile photo.
          </p>
        </div>
      </section>

      {/* Email */}
      <section className="mt-6 bg-white dark:bg-secondary-900 rounded-xl border border-gray-200 dark:border-white/10 p-5">
        <h2 className="text-lg font-semibold text-gunmetal-900 dark:text-white">Email</h2>
        <p className="text-sm text-gunmetal-600 dark:text-white/70 mt-1">
          Secure email changes require verification to the new address.
        </p>

        <div className="mt-4">
          <label className="block text-xs font-medium text-gunmetal-700 dark:text-white/70 mb-2">
            New email address
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="you@domain.com"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-white/20 bg-white dark:bg-secondary-950 text-gunmetal-900 dark:text-white"
            />
            <button
              onClick={requestEmailChange}
              disabled={Boolean(busy.email)}
              className="px-4 py-2 rounded-lg bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 disabled:opacity-50"
            >
              Send verification
            </button>
          </div>
          <p className="text-xs text-gunmetal-500 dark:text-white/50 mt-2">
            If you see a “recent login required” error, sign out and back in, then retry.
          </p>
        </div>
      </section>

      {/* Danger zone */}
      <section className="mt-6 bg-white dark:bg-secondary-900 rounded-xl border border-red-200 dark:border-red-500/40 p-5">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-300">Danger Zone</h2>
        <p className="text-sm text-gunmetal-600 dark:text-white/70 mt-1">
          Clear your usage/import data for experimentation. This is rate-limited and requires recent login.
        </p>

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button
            onClick={enableClearDataWindow}
            disabled={Boolean(busy.clearEnable)}
            className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-500/50 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold text-sm disabled:opacity-50"
          >
            Enable clear-data (15 min)
          </button>
          <div className="flex-1" />
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-gunmetal-700 dark:text-white/70 mb-2">
            Type CLEAR to confirm
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={clearConfirm}
              onChange={(e) => setClearConfirm(e.target.value)}
              placeholder="CLEAR"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-red-300 dark:border-red-500/40 bg-white dark:bg-secondary-950 text-gunmetal-900 dark:text-white"
            />
            <button
              onClick={clearMyData}
              disabled={Boolean(busy.clear)}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 disabled:opacity-50"
            >
              Clear my data
            </button>
          </div>
        </div>
      </section>

      <div className="h-10" />
    </div>
  )
}


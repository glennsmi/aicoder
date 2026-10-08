import { useEffect, useRef, useState } from 'react'
import { folderKey, storedFolder, readUsageDirectory, type UsageDirectory, type DirectoryPickerWindow } from '@/lib/rememberedFolders'

export default function RememberedUsageFolder({ accountId, source, extension, label, disabled, onFiles, onFallback }: {
  accountId?: string; source: string; extension: 'csv' | 'jsonl'; label: string; disabled: boolean
  onFiles: (files: File[]) => void | Promise<void>; onFallback?: () => void
}) {
  const [handle, setHandle] = useState<UsageDirectory>()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const generation = useRef(0)
  const supported = typeof (window as DirectoryPickerWindow).showDirectoryPicker === 'function'
  const key = accountId ? folderKey(accountId, source) : null
  useEffect(() => {
    const current = ++generation.current
    setHandle(undefined); setMessage(''); setBusy(false)
    if (key && supported) void storedFolder(key, 'get').then(value => {
      if (current === generation.current) setHandle(value)
    }).catch(() => {
      if (current === generation.current) setMessage('Folder memory is unavailable in this browser. You can still select a folder.')
    })
    return () => { generation.current++ }
  }, [key, supported])
  async function scan(reuse: boolean) {
    if (disabled || busy) return
    if (!supported) { onFallback?.(); return }
    const current = ++generation.current
    const active = () => current === generation.current
    setBusy(true); setMessage('Opening folder…')
    try {
      // Invoke the permission prompt directly from the click, before any storage await.
      let chosen: UsageDirectory
      if (reuse && handle) {
        if (await handle.requestPermission({ mode: 'read' }) !== 'granted') throw new Error('Folder access was not granted. Try again or choose another folder.')
        chosen = handle
      } else chosen = await (window as DirectoryPickerWindow).showDirectoryPicker!({ mode: 'read', id: `aicoder-${source}` })
      if (!active()) return
      setHandle(chosen)
      let remembered = !key
      if (key) {
        try { await storedFolder(key, 'put', chosen); remembered = true } catch { /* usable for this visit */ }
      }
      if (!active()) return
      setMessage('Reading folder and subfolders…')
      const files = await readUsageDirectory(chosen, extension, active)
      if (!active()) return
      setMessage(files.length ? `${files.length} files read.${!remembered ? ' Could not remember this folder for next time.' : ''}` : `No .${extension} files found. Choose another folder.`)
      await onFiles(files)
    } catch (error) {
      if (active()) setMessage(error instanceof DOMException && error.name === 'AbortError' ? '' : error instanceof Error ? error.message : 'Could not read the folder. Please select it again.')
    } finally { if (active()) setBusy(false) }
  }
  async function forget() {
    const current = ++generation.current
    if (key) {
      try { await storedFolder(key, 'delete') } catch { if (current === generation.current) setMessage('Could not forget the folder. Please try again.'); return }
    }
    if (current === generation.current) { setHandle(undefined); setMessage('Folder forgotten.') }
  }
  if (!supported && !onFallback) return null
  const button = 'rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50'
  return <div className="basis-full text-left" onClick={event => event.stopPropagation()}>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={button} disabled={disabled || busy} onClick={() => void scan(false)}>{busy ? 'Reading folder…' : label}</button>
      {supported && handle && <>
        <button type="button" className={button} disabled={disabled || busy} onClick={() => void scan(true)}>Read saved folder again</button>
        <button type="button" className={button} disabled={disabled || busy} onClick={() => void forget()}>Forget folder</button>
      </>}
    </div>
    {supported && <p className="mt-2 text-xs text-neutral-600 dark:text-gray-300">{handle ? `Folder: ${handle.name}. ` : ''}{accountId ? 'Remembered for this account on this browser and computer only. Browser permission may be requested again.' : 'Sign in to remember this folder for your next visit.'}</p>}
    {message && <p role="status" className="mt-1 text-xs text-neutral-700 dark:text-gray-200">{message}</p>}
  </div>
}

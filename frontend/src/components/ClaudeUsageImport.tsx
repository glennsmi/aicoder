import { checkpoint, loadCheckpoints, unchanged, saveCheckpoints, pendingUsage, type FileCheckpoint } from '@/lib/incrementalUsage'
import RememberedUsageFolder from '@/components/RememberedUsageFolder'
import { useRef, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/config/firebaseApp'
import { claudeToUsage } from '@/lib/claudeUsage'
import { parseClaudeFile, claudeLedgerCsv, mergeClaudeRows, type ClaudeLedgerRow } from '../../../shared/src/claudeLedger'
import type { CursorUsageV2 } from '@shared'

export default function ClaudeUsageImport({ signedIn, disabled, onImport, accountId }: {
  accountId?: string; signedIn: boolean; disabled: boolean; onImport: (rows: CursorUsageV2[]) => void
}) {
  const files = useRef<HTMLInputElement>(null), folder = useRef<HTMLInputElement>(null)
  const scannedFiles = useRef<FileCheckpoint[]>([])
  const [fullScan, setFullScan] = useState(false)
  const [rows, setRows] = useState<ClaudeLedgerRow[]>([])
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const [saveProgress, setSaveProgress] = useState<{ completed: number; total: number } | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  async function read(selected: FileList | File[] | null) {
    if (!selected) return
    scannedFiles.current = []
    const savedFiles = fullScan ? {} : loadCheckpoints(accountId, 'claude')
    let skippedFiles = 0
    setBusy(true); setMessage('Checking files for changes…'); setRows([]); setWarnings([])
    try {
      const collected: ClaudeLedgerRow[] = [], issues: string[] = []
      for (const file of Array.from(selected)) {
        if (!/\.(jsonl|json)$/i.test(file.name)) continue
        if (file.size > 100 * 1024 * 1024) { issues.push(`${file.name}: exceeds 100 MB; skipped`); continue }
        const stamp = checkpoint(file)
        if (unchanged(stamp, savedFiles)) { skippedFiles++; continue }
        const parsed = parseClaudeFile(await file.text())
        if (!parsed.warnings.length && parsed.rows.length) scannedFiles.current.push(stamp)
        collected.push(...parsed.rows)
        issues.push(...parsed.warnings.map(w => `${file.name}: ${w}`))
      }
      const result = mergeClaudeRows(collected)
      setRows(result); setWarnings(issues)
      setMessage(result.length ? `${result.length.toLocaleString()} usage records · ${result.reduce((n, r) => n + r.total_tokens, 0).toLocaleString()} tokens ready to check. ${skippedFiles} unchanged files skipped.` : skippedFiles ? `Up to date: ${skippedFiles} unchanged files skipped.` : 'No supported Claude token records found.')
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not read files') }
    finally { setBusy(false) }
  }
  async function importRows() {
    if (busy || disabled) return
    setBusy(true)
    if (signedIn) {
      setSaveProgress({ completed: 0, total: rows.length })
      setMessage(`Saving… 0 of ${rows.length.toLocaleString()} records processed. Keep this page open.`)
    }
    try {
      if (signedIn) {
        const ingest = httpsCallable(functions, 'ingestClaudeLedger')
        const pending = accountId ? await pendingUsage(rows, async summaries => {
          const response = await ingest({ checkOnly: true, rows: summaries })
          const result = response.data as { needed?: string[] }
          if (!Array.isArray(result.needed)) throw new Error('Incremental check unavailable. Deploy the updated save functions first.')
          return result.needed
        }, completed => setMessage(`Checking saved records… ${completed.toLocaleString()} of ${rows.length.toLocaleString()}.`)) : rows
        setSaveProgress({ completed: 0, total: pending.length })
        setMessage(`Saving ${pending.length.toLocaleString()} new or updated records; ${(rows.length - pending.length).toLocaleString()} already saved.`)
        let saved = 0, duplicates = rows.length - pending.length, updated = 0
        for (let i = 0; i < pending.length; i += 200) {
          const result = await ingest({ rows: pending.slice(i, i + 200) })
          const data = result.data as { saved: number; duplicates: number; updated: number }
          saved += data.saved; duplicates += data.duplicates; updated += data.updated
          const completed = Math.min(i + 200, pending.length)
          setSaveProgress({ completed, total: pending.length })
          setMessage(`Saving… ${completed.toLocaleString()} of ${pending.length.toLocaleString()} records processed (${Math.floor(completed / pending.length * 100)}%). Keep this page open.`)
        }
        if (accountId) saveCheckpoints(accountId, 'claude', scannedFiles.current)
        setMessage(`Saved ${saved} records; updated ${updated}; ${duplicates} already saved.`)
      } else setMessage('Added to this view. Sign in and import again to save to your account.')
      onImport(rows.map(claudeToUsage))
    } catch (e) { setMessage(`Save failed; retry safely. ${e instanceof Error ? e.message : ''}`) }
    finally { setBusy(false); setSaveProgress(null) }
  }
  function download(format: 'json' | 'csv') {
    const text = format === 'json' ? JSON.stringify({ schema: 'aicoder.claude.v1', rows }, null, 2) : claudeLedgerCsv(rows)
    const url = URL.createObjectURL(new Blob([text], { type: format === 'json' ? 'application/json' : 'text/csv' }))
    const a = document.createElement('a'); a.href = url; a.download = `claude-usage.${format}`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const locked = disabled || busy
  const button = 'rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50'
  return <section className="mt-5 rounded-xl border border-neutral-300 p-4 text-neutral-900 dark:border-gray-600 dark:text-white" aria-label="Claude Code usage import">
    <h3 className="font-semibold">Claude Code token usage</h3>
    <p className="mt-2 text-sm text-neutral-600 dark:text-gray-300">Select your ~/.claude/projects folder or session JSONL files. On macOS, press ⌘⇧G in the picker to enter that path. You can also select a previously exported ledger JSON.</p>
    <p className="mt-2 text-sm text-neutral-600 dark:text-gray-300">Files are parsed on your device. Only token counts, model, configuration, timestamps and session identifiers are saved when you import. Conversation content and local paths are excluded. Totals reflect recorded snapshots; incomplete logs or unfinished responses can undercount output. Subscription costs are unknown; these records do not represent billed API spend.</p>
    <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">Use either local logs or ccusage daily reports for the same dates. Importing both counts that usage twice because daily reports have no message IDs.</p>
    <input ref={files} type="file" accept=".jsonl,.json" multiple className="hidden" onChange={e => { void read(e.target.files); e.target.value = '' }} />
    <input ref={folder} type="file" multiple {...{ webkitdirectory: '' }} className="hidden" onChange={e => { void read(e.target.files); e.target.value = '' }} />
    <label className="mt-3 flex items-center gap-2 text-xs text-neutral-600 dark:text-gray-300">
      <input type="checkbox" checked={fullScan} disabled={locked} onChange={event => setFullScan(event.target.checked)} />
      Recheck all files (ignore saved file checkpoints)
    </label>
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" className={button} disabled={locked} onClick={() => files.current?.click()}>Select Claude Code files</button>
      <RememberedUsageFolder accountId={accountId} source="claude" extension="jsonl" label="Select Claude projects folder" disabled={locked} onFiles={read} onFallback={() => folder.current?.click()} />
      {rows.length > 0 && <>
        <button type="button" className={button} disabled={locked} onClick={() => void importRows()}>{saveProgress ? <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-spin" />Saving…</span> : signedIn ? 'Import and save' : 'Import into chart'}</button>
        <button type="button" className={button} disabled={locked} onClick={() => download('json')}>Export JSON</button>
        <button type="button" className={button} disabled={locked} onClick={() => download('csv')}>Export CSV</button>
      </>}
    </div>
    {saveProgress && <progress aria-label="Saving usage records" className="mt-3 h-2 w-full accent-primary-500" max={Math.max(1, saveProgress.total)} value={saveProgress.completed} />}
    <p role="status" className="mt-2 text-sm">{message}</p>
    {warnings.length > 0 && <details className="mt-2 text-sm text-amber-800 dark:text-amber-300"><summary>{warnings.length} parsing warnings</summary>{warnings.slice(0, 20).map((w, i) => <p key={i}>{w}</p>)}</details>}
  </section>
}

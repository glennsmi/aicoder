import { useRef, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/config/firebaseApp'
import { codexToUsage } from '@/lib/codexUsage'
import { parseCodexFile, codexLedgerCsv, type CodexLedgerRow } from '../../../shared/src/codexLedger'
import type { CursorUsageV2 } from '@shared'

export default function CodexUsageImport({ signedIn, disabled, onImport }: {
  signedIn: boolean; disabled: boolean; onImport: (rows: CursorUsageV2[]) => void
}) {
  const files = useRef<HTMLInputElement>(null), folder = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<CodexLedgerRow[]>([])
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const [saveProgress, setSaveProgress] = useState<{ completed: number; total: number } | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  async function read(selected: FileList | null) {
    if (!selected) return
    setBusy(true); setMessage('Reading local files…'); setRows([]); setWarnings([])
    try {
      const unique = new Map<string, CodexLedgerRow>(), issues: string[] = []
      for (const file of Array.from(selected)) {
        if (!/\.(jsonl|json)$/i.test(file.name)) continue
        if (file.size > 100 * 1024 * 1024) { issues.push(`${file.name}: exceeds 100 MB; skipped`); continue }
        const parsed = parseCodexFile(await file.text())
        for (const row of parsed.rows) unique.set(row.event_id, row)
        issues.push(...parsed.warnings.map(w => `${file.name}: ${w}`))
      }
      const result = [...unique.values()].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
      setRows(result); setWarnings(issues)
      setMessage(result.length ? `${result.length.toLocaleString()} usage records · ${result.reduce((n, r) => n + r.total_tokens, 0).toLocaleString()} tokens ready to import.` : 'No supported Codex token records found.')
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
        const ingest = httpsCallable(functions, 'ingestCodexLedger')
        let saved = 0, duplicates = 0
        for (let i = 0; i < rows.length; i += 200) {
          const result = await ingest({ rows: rows.slice(i, i + 200) })
          const data = result.data as { saved: number; duplicates: number }
          saved += data.saved; duplicates += data.duplicates
          const completed = Math.min(i + 200, rows.length)
          setSaveProgress({ completed, total: rows.length })
          setMessage(`Saving… ${completed.toLocaleString()} of ${rows.length.toLocaleString()} records processed (${Math.floor(completed / rows.length * 100)}%). Keep this page open.`)
        }
        setMessage(`Saved ${saved} records; ${duplicates} already saved.`)
      } else setMessage('Added to this view. Sign in and import again to save to your account.')
      onImport(rows.map(codexToUsage))
    } catch (e) { setMessage(`Save failed; retry safely. ${e instanceof Error ? e.message : ''}`) }
    finally { setBusy(false); setSaveProgress(null) }
  }
  function download(format: 'json' | 'csv') {
    const text = format === 'json' ? JSON.stringify({ schema: 'aicoder.codex.v1', rows }, null, 2) : codexLedgerCsv(rows)
    const url = URL.createObjectURL(new Blob([text], { type: format === 'json' ? 'application/json' : 'text/csv' }))
    const a = document.createElement('a'); a.href = url; a.download = `codex-usage.${format}`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const locked = disabled || busy
  const button = 'rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50'
  return <section className="mt-5 rounded-xl border border-neutral-300 p-4 text-neutral-900 dark:border-gray-600 dark:text-white" aria-label="Codex usage import">
    <h3 className="font-semibold">Codex token usage</h3>
    <p className="mt-2 text-sm text-neutral-600 dark:text-gray-300">Select your ~/.codex/sessions folder or session JSONL files. On macOS, press ⌘⇧G in the picker to enter that path. You can also select a previously exported ledger JSON.</p>
    <p className="mt-2 text-sm text-neutral-600 dark:text-gray-300">Files are parsed on your device. Only token counts, model, configuration, timestamps and session identifiers are saved when you import. Conversation content and local paths are excluded. Subscription costs are unknown; these records do not represent billed API spend.</p>
    <input ref={files} type="file" accept=".jsonl,.json" multiple className="hidden" onChange={e => { void read(e.target.files); e.target.value = '' }} />
    <input ref={folder} type="file" multiple {...{ webkitdirectory: '' }} className="hidden" onChange={e => { void read(e.target.files); e.target.value = '' }} />
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" className={button} disabled={locked} onClick={() => files.current?.click()}>Select Codex files</button>
      <button type="button" className={button} disabled={locked} onClick={() => folder.current?.click()}>Select sessions folder</button>
      {rows.length > 0 && <>
        <button type="button" className={button} disabled={locked} onClick={() => void importRows()}>{saveProgress ? <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-spin" />Saving…</span> : signedIn ? 'Import and save' : 'Import into chart'}</button>
        <button type="button" className={button} disabled={locked} onClick={() => download('json')}>Export JSON</button>
        <button type="button" className={button} disabled={locked} onClick={() => download('csv')}>Export CSV</button>
      </>}
    </div>
    {saveProgress && <progress aria-label="Saving usage records" className="mt-3 h-2 w-full accent-primary-500" max={saveProgress.total} value={saveProgress.completed} />}
    <p role="status" className="mt-2 text-sm">{message}</p>
    {warnings.length > 0 && <details className="mt-2 text-sm text-amber-800 dark:text-amber-300"><summary>{warnings.length} parsing warnings</summary>{warnings.slice(0, 20).map((w, i) => <p key={i}>{w}</p>)}</details>}
  </section>
}

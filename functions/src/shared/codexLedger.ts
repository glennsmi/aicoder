/** Portable, content-free local Codex ledger. Input includes cache; output includes reasoning. */
export interface CodexLedgerRow {
  event_id: string
  timestamp: string
  source: 'codex_local'
  session_id: string
  model: string
  reasoning_effort: string | null
  service_tier: string | null
  input_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  output_tokens: number
  reasoning_tokens: number
  total_tokens: number
  actual_cost_usd: null
  estimated_api_equivalent_cost_usd: null
}
export interface CodexLedger { schema: 'aicoder.codex.v1'; rows: CodexLedgerRow[] }
const count = (v: unknown): number => {
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0) throw new Error('Invalid token count')
  return v
}
const label = (v: unknown): string | null => typeof v === 'string' && v.length <= 200 ? v : null
export function validateCodexRow(value: unknown): CodexLedgerRow {
  const r = value as CodexLedgerRow
  if (!r || r.source !== 'codex_local' || !label(r.session_id) || !label(r.model) ||
      typeof r.event_id !== 'string' || r.event_id.length > 500 || !r.event_id.startsWith(`${r.session_id}:`) ||
      typeof r.timestamp !== 'string' || !Number.isFinite(Date.parse(r.timestamp))) throw new Error('Invalid Codex row')
  const input = count(r.input_tokens), output = count(r.output_tokens)
  const cache = count(r.cache_read_tokens), write = count(r.cache_write_tokens), reasoning = count(r.reasoning_tokens)
  if (cache + write > input || reasoning > output || count(r.total_tokens) !== input + output) throw new Error('Inconsistent token totals')
  return { event_id: r.event_id, timestamp: new Date(r.timestamp).toISOString(), source: 'codex_local',
    session_id: r.session_id, model: r.model, reasoning_effort: label(r.reasoning_effort), service_tier: label(r.service_tier),
    input_tokens: input, output_tokens: output, cache_read_tokens: cache, cache_write_tokens: write,
    reasoning_tokens: reasoning, total_tokens: input + output,
    actual_cost_usd: null, estimated_api_equivalent_cost_usd: null }
}

export function parseCodexFile(text: string): { rows: CodexLedgerRow[]; warnings: string[] } {
  const rows: CodexLedgerRow[] = [], warnings: string[] = []
  if (text.trimStart().startsWith('{')) {
    let document: any
    try { document = JSON.parse(text) } catch { /* JSONL */ }
    if (document?.schema === 'aicoder.codex.v1') {
      if (!Array.isArray(document.rows)) throw new Error('Ledger rows must be an array')
      return { rows: document.rows.map(validateCodexRow), warnings }
    }
  }
  let session = '', model = 'unknown', effort: string | null = null, tier: string | null = null
  let previous = [0, 0, 0, 0, 0]
  let epoch = 0
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    try {
      const e = JSON.parse(lines[i]), p = e.payload
      if (!p) continue
      if (e.type === 'session_meta') { session = label(p.id ?? p.session_id) || ''; continue }
      if (e.type === 'turn_context') {
        model = label(p.model) || 'unknown'; effort = label(p.effort ?? p.reasoning_effort)
        tier = label(p.service_tier); continue
      }
      if (e.type !== 'event_msg' || p.type !== 'token_count' || !p.info) continue
      const t = p.info.total_token_usage
      if (!t || !session) { warnings.push(`Line ${i + 1}: missing session or cumulative usage`); continue }
      const current = [count(t.input_tokens), count(t.cached_input_tokens ?? 0), count(t.cache_write_input_tokens ?? 0),
        count(t.output_tokens), count(t.reasoning_output_tokens ?? 0)]
      if (current.every((n, k) => n === previous[k])) continue
      // A reset is a new counter epoch. Never subtract across resets or sum cumulative snapshots.
      if (current.some((n, k) => n < previous[k])) {
        epoch++; previous = current
        warnings.push(`Line ${i + 1}: counters reset; baseline skipped to avoid attributing historical usage`)
        continue
      }
      const delta = current.map((n, k) => n - previous[k]); previous = current
      const row = validateCodexRow({ event_id: `${session}:${epoch}:${current.join(':')}`, timestamp: e.timestamp,
        source: 'codex_local', session_id: session, model, reasoning_effort: effort, service_tier: tier,
        input_tokens: delta[0], cache_read_tokens: delta[1], cache_write_tokens: delta[2],
        output_tokens: delta[3], reasoning_tokens: delta[4], total_tokens: delta[0] + delta[3] })
      if (row.total_tokens > 0) rows.push(row)
    } catch { warnings.push(`Line ${i + 1}: malformed or inconsistent record skipped`) }
  }
  return { rows, warnings }
}

export function codexLedgerCsv(rows: CodexLedgerRow[]): string {
  if (!rows.length) return ''
  const columns = Object.keys(rows[0]) as Array<keyof CodexLedgerRow>
  const cell = (v: unknown) => {
    let s = v == null ? '' : String(v)
    if (/^[=+@\-\t\r]/.test(s)) s = `'${s}`
    return `"${s.replace(/"/g, '""')}"`
  }
  return [columns.join(','), ...rows.map(r => columns.map(k => cell(r[k])).join(','))].join('\r\n')
}

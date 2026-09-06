/** Content-free Claude Code ledger. Normalized input INCLUDES both cache buckets. */
export interface ClaudeLedgerRow {
  event_id: string
  message_id: string
  timestamp: string
  source: 'claude_code_local'
  session_id: string
  model: string
  reasoning_effort: null
  service_tier: string | null
  speed: string | null
  input_tokens: number
  cache_read_tokens: number
  cache_write_tokens: number
  output_tokens: number
  reasoning_tokens: null
  total_tokens: number
  actual_cost_usd: null
  estimated_api_equivalent_cost_usd: null
}
const label = (v: unknown): string | null => typeof v === 'string' && v.trim().length > 0 && v.length <= 200 ? v : null
const count = (v: unknown): number => {
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0) throw new Error('Invalid token count')
  return v
}
export function validateClaudeRow(value: unknown): ClaudeLedgerRow {
  const r = value as ClaudeLedgerRow
  if (!r || r.source !== 'claude_code_local' || !label(r.session_id) || !label(r.model) ||
      !label(r.message_id) || r.event_id !== r.message_id || typeof r.timestamp !== 'string' ||
      !Number.isFinite(Date.parse(r.timestamp))) throw new Error('Invalid Claude Code row')
  const input = count(r.input_tokens), output = count(r.output_tokens)
  const cache = count(r.cache_read_tokens), write = count(r.cache_write_tokens)
  if (cache + write > input || count(r.total_tokens) !== input + output) throw new Error('Inconsistent token totals')
  return { event_id: r.message_id, message_id: r.message_id, timestamp: new Date(r.timestamp).toISOString(),
    source: 'claude_code_local', session_id: r.session_id, model: r.model,
    reasoning_effort: null, service_tier: label(r.service_tier), speed: label(r.speed),
    input_tokens: input, output_tokens: output, cache_read_tokens: cache, cache_write_tokens: write,
    reasoning_tokens: null, total_tokens: input + output, actual_cost_usd: null, estimated_api_equivalent_cost_usd: null }
}
/** Repeated assistant content blocks carry the SAME request usage. Retain the fullest snapshot. */
export function mergeClaudeRows(rows: ClaudeLedgerRow[]): ClaudeLedgerRow[] {
  const unique = new Map<string, ClaudeLedgerRow>()
  for (const row of rows) {
    const old = unique.get(row.event_id)
    if (!old || row.total_tokens > old.total_tokens) unique.set(row.event_id, row)
  }
  return [...unique.values()].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
}
export function parseClaudeFile(text: string): { rows: ClaudeLedgerRow[]; warnings: string[] } {
  const rows: ClaudeLedgerRow[] = [], warnings: string[] = []
  let document: any
  try { document = JSON.parse(text) } catch { /* JSONL */ }
  if (document?.schema === 'aicoder.claude.v1') {
    if (!Array.isArray(document.rows)) throw new Error('Ledger rows must be an array')
    return { rows: mergeClaudeRows(document.rows.map(validateClaudeRow)), warnings }
  }
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    try {
      const e = JSON.parse(lines[i]), m = e.message
      // Ignore user/system/result messages, including summaries and synthetic messages.
      if (e.type !== 'assistant' || !m?.usage || m.model === '<synthetic>') continue
      const u = m.usage
      const fresh = count(u.input_tokens), output = count(u.output_tokens)
      const cache = count(u.cache_read_input_tokens ?? 0), write = count(u.cache_creation_input_tokens ?? 0)
      const row = validateClaudeRow({ event_id: m.id, message_id: m.id, timestamp: e.timestamp,
        source: 'claude_code_local', session_id: e.sessionId, model: m.model,
        input_tokens: fresh + cache + write, output_tokens: output,
        cache_read_tokens: cache, cache_write_tokens: write, total_tokens: fresh + cache + write + output,
        service_tier: u.service_tier, speed: u.speed })
      if (row.total_tokens > 0) rows.push(row)
    } catch { warnings.push(`Line ${i + 1}: malformed or inconsistent record skipped`) }
  }
  return { rows: mergeClaudeRows(rows), warnings }
}
export function claudeLedgerCsv(rows: ClaudeLedgerRow[]): string {
  if (!rows.length) return ''
  const columns = Object.keys(rows[0]) as Array<keyof ClaudeLedgerRow>
  const cell = (v: unknown) => {
    let s = v == null ? '' : String(v)
    if (/^[=+@\-\t\r]/.test(s)) s = `'${s}`
    return `"${s.replace(/"/g, '""')}"`
  }
  return [columns.join(','), ...rows.map(r => columns.map(k => cell(r[k])).join(','))].join('\r\n')
}

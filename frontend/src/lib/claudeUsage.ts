import type { CursorUsageV2 } from '@shared'
import type { ClaudeLedgerRow } from '../../../shared/src/claudeLedger'
export function claudeToUsage(row: ClaudeLedgerRow): CursorUsageV2 {
  return {
    id: row.event_id, date: row.timestamp, timestamp: Date.parse(row.timestamp), model: row.model,
    expandedModelName: row.model, source: 'claude_code_local', tokens: row.total_tokens,
    tokenBreakdown: { inputWithoutCacheWrite: row.input_tokens - row.cache_read_tokens - row.cache_write_tokens,
      inputWithCacheWrite: row.cache_write_tokens, cacheRead: row.cache_read_tokens,
      output: row.output_tokens, total: row.total_tokens },
    raw: { ...row },
  }
}

import { describe, it, expect } from 'vitest'
import { parseClaudeFile, validateClaudeRow, mergeClaudeRows, claudeLedgerCsv } from '../../../shared/src/claudeLedger'
import { claudeToUsage } from './claudeUsage'
const event = (id = 'msg-1', output = 20, sessionId = 'session-1') => ({ type: 'assistant', sessionId,
  timestamp: '2026-09-06T12:00:00Z', cwd: '/private/project', uuid: 'block-id',
  message: { id, model: 'claude-sonnet-4-6', content: [{ text: 'secret conversation' }], usage: {
    input_tokens: 100, cache_read_input_tokens: 40, cache_creation_input_tokens: 10,
    cache_creation: { ephemeral_5m_input_tokens: 10 }, output_tokens: output, service_tier: 'standard', speed: 'fast' } } })
const parse = (...events: unknown[]) => parseClaudeFile(events.map(e => JSON.stringify(e)).join('\n'))
describe('Claude local ledger', () => {
  it('adds the independent cache buckets exactly once', () => {
    const row = parse(event()).rows[0]
    expect(row.input_tokens).toBe(150); expect(row.total_tokens).toBe(170)
    expect(claudeToUsage(row).tokenBreakdown).toEqual({ inputWithoutCacheWrite: 100, inputWithCacheWrite: 10, cacheRead: 40, output: 20, total: 170 })
    expect(row.speed).toBe('fast'); expect(row.reasoning_tokens).toBeNull()
    expect(claudeToUsage(row).costUsd).toBeUndefined()
  })
  it('deduplicates content blocks and uses the fullest streaming snapshot regardless of order', () => {
    expect(parse(event(), event('msg-1', 30), event('msg-1', 5)).rows.map(r => r.total_tokens)).toEqual([180])
  })
  it('deduplicates copied history across sessions and files without collapsing independent requests', () => {
    const first = parse(event()).rows, copied = parse(event('msg-1', 30, 'fork'), event('msg-2', 20)).rows
    expect(mergeClaudeRows([...first, ...copied]).map(r => r.total_tokens)).toEqual([180, 170])
  })
  it('includes subagent requests with their own message IDs', () => {
    expect(parse(event(), { ...event('msg-agent'), isSidechain: true, agentId: 'agent-1' }).rows).toHaveLength(2)
  })
  it('ignores summaries, synthetic messages and user content', () => {
    const synthetic = event(); synthetic.message.model = '<synthetic>'
    expect(parse({ ...event(), type: 'user' }, { type: 'result', usage: { input_tokens: 9999 } }, synthetic).rows).toEqual([])
  })
  it('warns about malformed records and missing message identities', () => {
    const bad = event(); bad.message.id = ''
    expect(parse(bad).warnings).toHaveLength(1)
    expect(parseClaudeFile('{broken\n' + JSON.stringify(event())).rows).toHaveLength(1)
  })
  it('exports only allowlisted metadata and round trips JSON', () => {
    const rows = parse(event()).rows, json = JSON.stringify({ schema: 'aicoder.claude.v1', rows })
    expect(json).not.toContain('secret'); expect(json).not.toContain('/private/project')
    expect(parseClaudeFile(json).rows).toEqual(rows)
    expect(validateClaudeRow({ ...rows[0], actual_cost_usd: 45, secret: 'private' })).toEqual(rows[0])
    expect(claudeLedgerCsv([{ ...rows[0], model: '=formula' }])).toContain("'=formula")
  })
  it('rejects unsafe counts, inconsistent totals and mismatched identities', () => {
    const row = parse(event()).rows[0]
    for (const patch of [{ input_tokens: -1 }, { input_tokens: Infinity }, { cache_read_tokens: 200 }, { total_tokens: 999 }, { event_id: 'different' }]) {
      expect(() => validateClaudeRow({ ...row, ...patch })).toThrow()
    }
  })
})

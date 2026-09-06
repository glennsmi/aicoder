import { describe, it, expect } from 'vitest'
import { parseCodexFile, validateCodexRow, codexLedgerCsv } from '../../../shared/src/codexLedger'
import { codexToUsage } from './codexUsage'
const meta = JSON.stringify({ type: 'session_meta', payload: { id: 'session-1', cwd: '/private/project', base_instructions: 'secret' } })
const context = JSON.stringify({ type: 'turn_context', payload: { model: 'gpt-5-codex', effort: 'high' } })
const usage = (input = 100, output = 20, cache = 40) => JSON.stringify({ type: 'event_msg', timestamp: '2026-09-06T12:00:00Z', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: input, output_tokens: output, cached_input_tokens: cache, reasoning_output_tokens: 10 } } } })
const parse = (...lines: string[]) => parseCodexFile([meta, context, ...lines].join('\n'))
describe('Codex ledger compatibility', () => {
  it('uses cumulative deltas and ignores repeated snapshots', () => {
    const { rows } = parse(usage(), usage(), usage(150, 30, 60))
    expect(rows.map(r => r.total_tokens)).toEqual([120, 60])
    expect(rows.reduce((n, r) => n + r.total_tokens, 0)).toBe(180)
    expect(rows[0].reasoning_effort).toBe('high')
  })
  it('maps cache and reasoning as subsets, preserving total', () => {
    const row = parse(usage()).rows[0], ui = codexToUsage(row)
    expect(ui.tokenBreakdown).toEqual({ inputWithoutCacheWrite: 60, inputWithCacheWrite: 0, cacheRead: 40, output: 20, total: 120 })
    expect(ui.costUsd).toBeUndefined()
    expect(row.reasoning_tokens).toBe(10)
  })
  it('exports only metadata and round trips stable identities', () => {
    const rows = parse(usage()).rows
    const json = JSON.stringify({ schema: 'aicoder.codex.v1', rows })
    expect(json).not.toContain('secret'); expect(json).not.toContain('/private/project')
    expect(parseCodexFile(json).rows).toEqual(rows)
    expect(parse(usage(), usage(150, 30, 60)).rows[0].event_id).toBe(rows[0].event_id)
  })
  it('warns on broken lines and counter resets', () => {
    const result = parse(usage(), '{broken', usage(50, 15, 20), usage(70, 20, 25))
    expect(result.warnings).toHaveLength(2)
    expect(result.rows.map(r => r.total_tokens)).toEqual([120, 25])
  })
  it('rejects invalid counts and strips untrusted costs and content', () => {
    const row = parse(usage()).rows[0]
    expect(() => validateCodexRow({ ...row, input_tokens: -1 })).toThrow()
    expect(() => validateCodexRow({ ...row, cache_read_tokens: 101 })).toThrow()
    expect(() => validateCodexRow({ ...row, total_tokens: 999 })).toThrow()
    expect(validateCodexRow({ ...row, actual_cost_usd: 42, secret: 'private' })).toEqual(row)
    expect(codexLedgerCsv([{ ...row, model: '=formula' }])).toContain("'=formula")
  })
  it('does not invent usage when events have no token information', () => {
    expect(parse(JSON.stringify({ type: 'event_msg', payload: { type: 'token_count', info: null } })).rows).toEqual([])
  })
})

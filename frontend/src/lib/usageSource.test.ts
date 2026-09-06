import { expect, it } from 'vitest'
import { usageSourceLabel, usageSourceTools } from './usageSource'
import { aggregateCursorUsageV2ToHourlyByModel } from './hourlyBuckets'
import type { CursorUsageV2 } from '@shared'
const row = (source: string): CursorUsageV2 => ({ id: source, source, model: 'claude-sonnet-4-6', date: '2026-09-06', timestamp: 1788696000000, tokens: 100 })
it('labels tools independently of model vendors', () => {
  expect(usageSourceTools(row('cursor_csv'))).toEqual(['Cursor'])
  expect(usageSourceLabel('codex_local')).toBe('Codex')
  expect(usageSourceLabel('claude_code_local')).toBe('Claude Code')
  expect(usageSourceLabel('ccusage_daily_json')).toBe('Claude Code')
  expect(usageSourceLabel('openai_api')).toBe('OpenAI API')
  expect(usageSourceLabel(undefined)).toBe('Unknown')
})
it('retains every tool when the same model/hour is aggregated', () => {
  const buckets = aggregateCursorUsageV2ToHourlyByModel([row('cursor_csv'), row('claude_code_local')])
  expect(buckets).toHaveLength(1)
  expect(usageSourceTools(buckets[0])).toEqual(['Claude Code', 'Cursor'])
  expect(buckets[0].tokens).toBe(200)
})
it('groups local and ccusage Claude records under one tool label', () => {
  const buckets = aggregateCursorUsageV2ToHourlyByModel([row('ccusage_daily_json'), row('claude_code_local'), row('codex_local'), row('cursor_csv')], { groupBy: 'source' })
  expect(buckets.map(b => b.model)).toEqual(['Claude Code', 'Codex', 'Cursor'])
  expect(buckets[0].tokens).toBe(200)
  expect(buckets.map(b => usageSourceLabel(b.source))).toEqual(['Claude Code', 'Codex', 'Cursor'])
})

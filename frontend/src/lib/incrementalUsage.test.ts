import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { checkpoint, loadCheckpoints, saveCheckpoints, unchanged, pendingUsage } from './incrementalUsage'
beforeEach(() => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) })
})
afterEach(() => vi.unstubAllGlobals())
it('only skips the exact file version confirmed saved for this account and tool', () => {
  const f = new File(['abc'], 'session.jsonl', { lastModified: 100 })
  const stamp = checkpoint(f)
  expect(unchanged(stamp, loadCheckpoints('alice', 'codex'))).toBe(false)
  saveCheckpoints('alice', 'codex', [stamp])
  expect(unchanged(stamp, loadCheckpoints('alice', 'codex'))).toBe(true)
  expect(unchanged({ ...stamp, size: 4 }, loadCheckpoints('alice', 'codex'))).toBe(false)
  expect(unchanged({ ...stamp, modified: 101 }, loadCheckpoints('alice', 'codex'))).toBe(false)
  expect(unchanged(stamp, loadCheckpoints('bob', 'codex'))).toBe(false)
  expect(unchanged(stamp, loadCheckpoints('alice', 'claude'))).toBe(false)
})
it('checks bounded identity batches and only returns missing or updated records', async () => {
  const rows = Array.from({ length: 401 }, (_, i) => ({ event_id: String(i), total_tokens: i, privatePayload: 'not sent in check' }))
  const check = vi.fn(async (batch: Array<{ event_id: string }>) => batch.filter(r => r.event_id === '400').map(r => r.event_id))
  const progress = vi.fn()
  expect(await pendingUsage(rows, check, progress)).toEqual([rows[400]])
  expect(check.mock.calls.map(c => c[0].length)).toEqual([200, 200, 1])
  expect(JSON.stringify(check.mock.calls)).not.toContain('privatePayload')
  expect(progress).toHaveBeenLastCalledWith(401)
})
it('does not treat a failed preflight as already saved', async () => {
  await expect(pendingUsage([{ event_id: '1', total_tokens: 1 }], async () => { throw Error('offline') }, () => {})).rejects.toThrow('offline')
})

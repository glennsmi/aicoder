import { expect, it } from 'vitest'
import { readUsageDirectory, folderKey, type UsageDirectory } from './rememberedFolders'
const file = (name: string) => ({ kind: 'file' as const, name, getFile: async () => new File([''], name) })
function dir(name: string, entries: Array<UsageDirectory | ReturnType<typeof file>>): UsageDirectory {
  return { kind: 'directory', name, requestPermission: async () => 'granted', async *values() { yield* entries } }
}
it('recurses through year/month/day and filters unrelated files', async () => {
  const root = dir('sessions', [dir('2026', [dir('09', [dir('08', [file('one.jsonl'), file('private.txt')])])]), file('two.JSONL')])
  expect((await readUsageDirectory(root, 'jsonl')).map(f => f.name)).toEqual(['one.jsonl', 'two.JSONL'])
})
it('reads only CSV exports for Cursor and can stop a stale scan', async () => {
  const root = dir('exports', [file('usage.csv'), file('other.jsonl')])
  expect((await readUsageDirectory(root, 'csv')).map(f => f.name)).toEqual(['usage.csv'])
  await expect(readUsageDirectory(root, 'csv', () => false)).rejects.toHaveProperty('name', 'AbortError')
})
it('keeps account and source keys unambiguous', () => {
  expect(folderKey('alice', 'codex')).not.toBe(folderKey('alice', 'claude'))
  expect(folderKey('alice', 'codex')).not.toBe(folderKey('bob', 'codex'))
})

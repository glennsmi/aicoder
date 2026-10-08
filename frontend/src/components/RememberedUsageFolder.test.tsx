import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import type { UsageDirectory } from '@/lib/rememberedFolders'
const storage = vi.hoisted(() => new Map<string, unknown>())
vi.mock('@/lib/rememberedFolders', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/rememberedFolders')>()
  return { ...original, storedFolder: vi.fn(async (key, operation, handle) => {
    if (operation === 'get') return storage.get(key)
    if (operation === 'put') storage.set(key, handle)
    if (operation === 'delete') storage.delete(key)
  }) }
})
import RememberedUsageFolder from './RememberedUsageFolder'
import { folderKey, storedFolder } from '@/lib/rememberedFolders'
const file = new File(['usage'], 'session.jsonl')
function folder(): UsageDirectory {
  return { kind: 'directory', name: 'sessions', requestPermission: vi.fn(async () => 'granted' as const),
    async *values() { yield { kind: 'file', name: file.name, getFile: async () => file } } }
}
const props = { accountId: 'alice', source: 'codex', extension: 'jsonl' as const, label: 'Select folder', disabled: false }
beforeEach(() => { storage.clear(); vi.clearAllMocks(); vi.stubGlobal('showDirectoryPicker', vi.fn(async () => folder())) })
afterEach(() => vi.unstubAllGlobals())
it('remembers the selection across remounts and reads it again only on click', async () => {
  const onFiles = vi.fn()
  const first = render(<RememberedUsageFolder {...props} onFiles={onFiles} />)
  fireEvent.click(screen.getByText('Select folder'))
  await waitFor(() => expect(onFiles).toHaveBeenCalledWith([file]))
  expect(storage.has(folderKey('alice', 'codex'))).toBe(true)
  first.unmount(); onFiles.mockClear()
  render(<RememberedUsageFolder {...props} onFiles={onFiles} />)
  await screen.findByText('Read saved folder again')
  expect(onFiles).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText('Read saved folder again'))
  await waitFor(() => expect(onFiles).toHaveBeenCalledOnce())
  expect((window as unknown as { showDirectoryPicker: unknown }).showDirectoryPicker).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByText('Forget folder'))
  await screen.findByText('Folder forgotten.')
  expect(storage.size).toBe(0)
})
it('isolates folder handles by account and tool', async () => {
  storage.set(folderKey('alice', 'codex'), folder())
  const view = render(<RememberedUsageFolder {...props} onFiles={vi.fn()} />)
  await screen.findByText('Read saved folder again')
  view.rerender(<RememberedUsageFolder {...props} accountId="bob" onFiles={vi.fn()} />)
  await waitFor(() => expect(screen.queryByText('Read saved folder again')).toBeNull())
  view.rerender(<RememberedUsageFolder {...props} source="claude" onFiles={vi.fn()} />)
  await waitFor(() => expect(storedFolder).toHaveBeenLastCalledWith(folderKey('alice', 'claude'), 'get'))
  expect(screen.queryByText('Read saved folder again')).toBeNull()
})
it('handles denied permission without reading files', async () => {
  const handle = folder(); handle.requestPermission = vi.fn(async () => 'denied' as const)
  storage.set(folderKey('alice', 'codex'), handle)
  const onFiles = vi.fn()
  render(<RememberedUsageFolder {...props} onFiles={onFiles} />)
  fireEvent.click(await screen.findByText('Read saved folder again'))
  await screen.findByText(/Folder access was not granted/)
  expect(onFiles).not.toHaveBeenCalled()
})
it('does not deliver a folder read after the account changes', async () => {
  let finish!: (handle: UsageDirectory) => void
  vi.stubGlobal('showDirectoryPicker', vi.fn(() => new Promise(resolve => { finish = resolve })))
  const onFiles = vi.fn()
  const view = render(<RememberedUsageFolder {...props} onFiles={onFiles} />)
  fireEvent.click(screen.getByText('Select folder'))
  view.rerender(<RememberedUsageFolder {...props} accountId="bob" onFiles={onFiles} />)
  await act(async () => finish(folder()))
  expect(onFiles).not.toHaveBeenCalled()
  expect(storage.size).toBe(0)
})
it('uses the existing folder picker when the browser cannot remember handles', () => {
  vi.stubGlobal('showDirectoryPicker', undefined)
  const fallback = vi.fn()
  render(<RememberedUsageFolder {...props} onFiles={vi.fn()} onFallback={fallback} />)
  fireEvent.click(screen.getByText('Select folder'))
  expect(fallback).toHaveBeenCalledOnce()
})

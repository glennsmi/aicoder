import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi, it, expect, beforeEach } from 'vitest'
vi.mock('@/config/firebaseApp', () => ({ functions: {} }))
const ingest = vi.hoisted(() => vi.fn())
vi.mock('firebase/functions', () => ({ httpsCallable: () => ingest }))
import ClaudeUsageImport from './ClaudeUsageImport'
beforeEach(() => { ingest.mockReset() })
async function select(container: HTMLElement) {
  const text = JSON.stringify({ type: 'assistant', sessionId: 'session-1', timestamp: '2026-09-06T12:00:00Z',
    message: { id: 'msg-1', model: 'claude-sonnet-4-6', content: [{ text: 'private' }], usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 40 } } })
  fireEvent.change(container.querySelector('input')!, { target: { files: [{ name: 'session.jsonl', size: text.length, text: async () => text }] } })
  await screen.findByText(/1 usage records/)
}
it('previews locally and imports into the guest chart only when clicked', async () => {
  const onImport = vi.fn()
  const { container } = render(<ClaudeUsageImport signedIn={false} disabled={false} onImport={onImport} />)
  await select(container)
  expect(onImport).not.toHaveBeenCalled(); expect(ingest).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText('Import into chart'))
  await waitFor(() => expect(onImport).toHaveBeenCalledOnce())
  expect(ingest).not.toHaveBeenCalled()
  expect(onImport.mock.calls[0][0][0].tokens).toBe(160)
})
it('saves only sanitized rows and reports updated records', async () => {
  ingest.mockResolvedValue({ data: { saved: 0, duplicates: 0, updated: 1 } })
  const onImport = vi.fn()
  const { container } = render(<ClaudeUsageImport signedIn disabled={false} onImport={onImport} />)
  await select(container)
  fireEvent.click(screen.getByText('Import and save'))
  await screen.findByText('Saved 0 records; updated 1; 0 already saved.')
  expect(JSON.stringify(ingest.mock.calls)).not.toContain('private')
  expect(onImport).toHaveBeenCalledOnce()
})
it('shows retryable save failures without claiming a successful import', async () => {
  ingest.mockRejectedValue(new Error('offline'))
  const onImport = vi.fn()
  const { container } = render(<ClaudeUsageImport signedIn disabled={false} onImport={onImport} />)
  await select(container)
  fireEvent.click(screen.getByText('Import and save'))
  await screen.findByText('Save failed; retry safely. offline')
  expect(onImport).not.toHaveBeenCalled()
  expect(screen.getByText('Import and save')).not.toBeDisabled()
})

it('shows a spinner and progress until the save completes', async () => {
  let finish!: (value: unknown) => void
  ingest.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const { container } = render(<ClaudeUsageImport signedIn disabled={false} onImport={vi.fn()} />)
  await select(container)
  fireEvent.click(screen.getByText('Import and save'))
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0')
  expect(screen.getByRole('status')).toHaveTextContent('Saving 1 new or updated records')
  await act(async () => finish({ data: { saved: 1, duplicates: 0, updated: 0 } }))
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  expect(screen.getByText('Import and save')).not.toBeDisabled()
  expect(screen.getByRole('status')).toHaveTextContent('Saved 1 records')
})

it('checks historical records before upload and does not resend already saved rows', async () => {
  ingest.mockResolvedValue({ data: { needed: [] } })
  const onImport = vi.fn()
  const { container } = render(<ClaudeUsageImport signedIn accountId="alice" disabled={false} onImport={onImport} />)
  await select(container)
  fireEvent.click(screen.getByText('Import and save'))
  await screen.findByText('Saved 0 records; updated 0; 1 already saved.')
  expect(ingest).toHaveBeenCalledOnce()
  expect(ingest).toHaveBeenCalledWith({ checkOnly: true, rows: [{ event_id: 'msg-1', total_tokens: 160 }] })
  expect(onImport).toHaveBeenCalledOnce()
})

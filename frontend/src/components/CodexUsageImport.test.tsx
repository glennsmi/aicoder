import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi, it, expect } from 'vitest'
vi.mock('@/config/firebaseApp', () => ({ functions: {} }))
const ingest = vi.hoisted(() => vi.fn())
vi.mock('firebase/functions', () => ({ httpsCallable: () => ingest }))
import CodexUsageImport from './CodexUsageImport'
it('previews locally, then explicitly imports into the guest chart', async () => {
  const onImport = vi.fn()
  const { container } = render(<CodexUsageImport signedIn={false} disabled={false} onImport={onImport} />)
  const text = [
    { type: 'session_meta', payload: { id: 'session-1' } },
    { type: 'turn_context', payload: { model: 'gpt-5-codex' } },
    { type: 'event_msg', timestamp: '2026-09-06T12:00:00Z', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 100, output_tokens: 20 } } } },
  ].map(e => JSON.stringify(e)).join('\n')
  fireEvent.change(container.querySelector('input')!, { target: { files: [{ name: 'session.jsonl', size: text.length, text: async () => text }] } })
  await screen.findByText('Import into chart')
  expect(onImport).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText('Import into chart'))
  await waitFor(() => expect(onImport).toHaveBeenCalledOnce())
  expect(ingest).not.toHaveBeenCalled()
  expect(onImport.mock.calls[0][0][0].tokens).toBe(120)
})

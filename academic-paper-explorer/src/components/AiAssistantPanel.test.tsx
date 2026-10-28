import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import AiAssistantPanel from './AiAssistantPanel'

vi.mock('../lib/aiAgent', () => ({
  ensureSession: vi.fn(async () => 's1'),
  sendMessage: vi.fn(async () => ({ sessionId: 's1' })),
  abortSession: vi.fn(async () => {}),
  fetchHistory: vi.fn(async () => []),
  streamEvents: vi.fn(() => () => {}),
}))

afterEach(() => vi.clearAllMocks())

describe('AiAssistantPanel', () => {
  it('boots a session and sends a message', async () => {
    const { ensureSession, sendMessage } = await import('../lib/aiAgent')
    render(<AiAssistantPanel arxivId="2401.00001" selection="" target="zh" onClose={() => {}} />)
    await waitFor(() => expect(ensureSession).toHaveBeenCalledWith('2401.00001'))
    fireEvent.change(screen.getByPlaceholderText('就论文提问…'), { target: { value: 'loss?' } })
    fireEvent.click(screen.getByRole('button', { name: '发送' }))
    await waitFor(() => expect(sendMessage).toHaveBeenCalled())
    expect((sendMessage as any).mock.calls[0][0]).toMatchObject({ sessionId: 's1', message: 'loss?', target: 'zh' })
  })

  it('renders assistant history as Markdown with LaTeX math', async () => {
    const { fetchHistory } = await import('../lib/aiAgent')
    ;(fetchHistory as any).mockResolvedValueOnce([
      { role: 'assistant', text: '## 结论\n\n论文**没有**点名数据集。\n\n$A_d = R_s A_s$' },
    ])
    const { container } = render(
      <AiAssistantPanel arxivId="2401.00003" selection="" target="zh" onClose={() => {}} />,
    )
    expect(await screen.findByRole('heading', { name: '结论' })).toBeTruthy()
    expect(container.querySelector('.katex')).toBeTruthy()
  })

  it('reconciles the transcript from history when the turn completes', async () => {
    const { streamEvents, fetchHistory } = await import('../lib/aiAgent')
    let onEvent: ((e: unknown) => void) | null = null
    ;(streamEvents as any).mockImplementation((_id: string, cb: (e: unknown) => void) => {
      onEvent = cb
      return () => {}
    })
    render(<AiAssistantPanel arxivId="2401.00002" selection="" target="zh" onClose={() => {}} />)
    await waitFor(() => expect(fetchHistory).toHaveBeenCalled())
    fireEvent.change(screen.getByPlaceholderText('就论文提问…'), { target: { value: 'q' } })
    fireEvent.click(screen.getByRole('button', { name: '发送' }))
    await waitFor(() => expect(streamEvents).toHaveBeenCalled())
    const before = (fetchHistory as any).mock.calls.length
    act(() => onEvent!({ type: 'done' }))
    await waitFor(() => expect((fetchHistory as any).mock.calls.length).toBeGreaterThan(before))
  })

  it('shows an error when session bootstrap fails', async () => {
    const { ensureSession } = await import('../lib/aiAgent')
    ;(ensureSession as any).mockRejectedValueOnce(new Error('nope'))
    render(<AiAssistantPanel arxivId="x" selection="" target="zh" onClose={() => {}} />)
    expect(await screen.findByText(/nope/)).toBeTruthy()
  })
})

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Send, Sparkles, Square } from 'lucide-react'
import { useAiChatStore } from '../store/useAiChatStore'
import { abortSession, ensureSession, fetchHistory, sendMessage, streamEvents } from '../lib/aiAgent'
import AiMarkdown from './AiMarkdown'

interface Props {
  arxivId: string
  selection: string
  target: string
  onClose: () => void
}

const AiAssistantPanel: React.FC<Props> = ({ arxivId, selection, target, onClose }) => {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const chat = useAiChatStore((s) => s.chats[arxivId])
  const sessionId = useAiChatStore((s) => s.sessions[arxivId])
  const setSession = useAiChatStore((s) => s.setSession)
  const setHistory = useAiChatStore((s) => s.setHistory)
  const beginTurn = useAiChatStore((s) => s.beginTurn)
  const applyEvent = useAiChatStore((s) => s.applyEvent)
  const unsubRef = useRef<(() => void) | null>(null)

  const reloadHistory = useCallback(
    async (id: string) => {
      const history = await fetchHistory(id)
      setHistory(
        arxivId,
        history.map((m, i) => ({ id: `h-${i}`, role: m.role, text: m.text, tools: [] })),
      )
    },
    [arxivId, setHistory],
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const id = await ensureSession(arxivId)
        if (cancelled) return
        setSession(arxivId, id)
        await reloadHistory(id)
        if (cancelled) return
        setReady(true)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '初始化失败')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [arxivId, setSession, reloadHistory])

  useEffect(() => () => unsubRef.current?.(), [])

  const subscribe = useCallback(
    (id: string) => {
      unsubRef.current?.()
      unsubRef.current = streamEvents(
        id,
        (event) => {
          applyEvent(arxivId, event)
          if (event.type === 'done') {
            unsubRef.current?.()
            unsubRef.current = null
            void reloadHistory(id)
          }
        },
        (e) => {
          setError(e instanceof Error ? e.message : '事件流断开')
          void reloadHistory(id)
        },
      )
    },
    [arxivId, applyEvent, reloadHistory],
  )

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || !sessionId) return
    setInput('')
    setError(null)
    beginTurn(arxivId, text)
    subscribe(sessionId)
    try {
      const returned = await sendMessage({ sessionId, message: text, excerpt: selection || undefined, target })
      if (returned.sessionId !== sessionId) {
        setSession(arxivId, returned.sessionId)
        subscribe(returned.sessionId)
      }
    } catch (e) {
      unsubRef.current?.()
      unsubRef.current = null
      setError(e instanceof Error ? e.message : '发送失败')
      applyEvent(arxivId, { type: 'error', message: e instanceof Error ? e.message : '发送失败' })
    }
  }, [input, sessionId, arxivId, selection, target, beginTurn, applyEvent, setSession, subscribe])

  const stop = useCallback(() => {
    if (sessionId) void abortSession(sessionId)
  }, [sessionId])

  return (
    <aside className="flex h-full w-full flex-col bg-gray-800">
      <div className="flex items-center justify-between border-b border-gray-700 px-3 py-2">
        <span className="flex items-center gap-1 text-sm font-medium">
          <Sparkles className="h-3 w-3" /> AI 助手
        </span>
        <button aria-label="关闭 AI" onClick={onClose} className="text-gray-400 hover:text-white">
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 text-sm" data-testid="ai-messages">
        {!chat || chat.messages.length === 0 ? (
          <p className="text-xs text-gray-500">就这篇论文提问，AI 会先检索正文再回答。</p>
        ) : (
          chat.messages.map((m) => (
            <div key={m.id} className={m.role === 'user' ? 'text-right' : ''}>
              {m.role === 'assistant' && m.tools.length > 0 && (
                <div className="mb-1 flex flex-wrap gap-1">
                  {m.tools.map((t, i) => (
                    <span key={i} className="rounded bg-gray-700 px-2 py-0.5 text-[10px] text-gray-300">
                      {t.status === 'start' ? '检索中' : '已检索'}：{t.name}
                      {t.detail ? ` (${t.detail})` : ''}
                    </span>
                  ))}
                </div>
              )}
              <div
                className={
                  'max-w-full rounded px-2 py-1 text-xs leading-relaxed ' +
                  (m.role === 'user'
                    ? 'inline-block whitespace-pre-wrap bg-indigo-600 text-left text-white'
                    : 'block bg-gray-900 text-gray-200')
                }
              >
                {m.role === 'assistant' ? (
                  m.text ? (
                    <AiMarkdown text={m.text} />
                  ) : chat.streaming ? (
                    '思考中…'
                  ) : null
                ) : (
                  m.text
                )}
              </div>
              {m.error && <div className="mt-1 text-xs text-red-400">{m.error}</div>}
            </div>
          ))
        )}
        {!ready && !error && <div className="text-xs text-gray-500">正在连接…</div>}
      </div>

      {error && <div className="px-3 pb-1 text-xs text-red-400">{error}</div>}

      <div className="flex gap-2 border-t border-gray-700 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void send()}
          placeholder="就论文提问…"
          disabled={!ready}
          className="flex-1 rounded bg-gray-900 px-2 py-1 text-xs outline-none placeholder:text-gray-500 disabled:opacity-50"
        />
        {chat?.streaming ? (
          <button
            type="button"
            aria-label="停止"
            onClick={stop}
            className="rounded bg-gray-600 px-2 py-1 text-white hover:bg-gray-500"
          >
            <Square className="h-3 w-3" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="发送"
            onClick={() => void send()}
            disabled={!input.trim() || !ready}
            className="rounded bg-indigo-600 px-2 py-1 text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {ready ? <Send className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
          </button>
        )}
      </div>
    </aside>
  )
}

export default AiAssistantPanel

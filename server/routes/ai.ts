import type { Database } from 'bun:sqlite'
import { readJson, json, ApiError } from '../errors'
import { loadProviders } from '../llm'
import { getArxivBySession, getSession, setSession } from '../ai-sessions'
import { OPENCODE_AGENT } from '../opencode-config'
import { normalizeOpencodeEvent, serializeClientEvent } from '../ai-events'
import type { OpencodeClient } from '../opencode'

const MAX_MESSAGE_CHARS = 8000
const MAX_EXCERPT_CHARS = 20000
const MAX_SESSION_ID_CHARS = 200

function firstOpenaiProvider() {
  const provider = loadProviders().find((p) => p.kind === 'openai')
  if (!provider) throw new ApiError('LLM_UNAVAILABLE', '未配置可用的 AI provider', 503)
  return provider
}

export async function aiSessionRoute(req: Request, db: Database, client: OpencodeClient): Promise<Response> {
  const body = await readJson<{ arxivId?: unknown }>(req)
  if (!body || typeof body !== 'object') throw new ApiError('VALIDATION_FAILED', '请求体必须是对象')
  const arxivId = typeof body.arxivId === 'string' ? body.arxivId.trim() : ''
  if (!arxivId) throw new ApiError('VALIDATION_FAILED', 'arxivId 不能为空')
  if (arxivId.length > 64) throw new ApiError('VALIDATION_FAILED', 'arxivId 过长')
  let sessionId = getSession(arxivId, db)
  // The stored mapping can point at a session that no longer exists (e.g. after
  // an opencode restart); validate and recreate so a paper never gets stuck.
  if (sessionId && !(await client.sessionExists(sessionId))) sessionId = null
  if (!sessionId) {
    sessionId = await client.createSession(`paper:${arxivId}`)
    setSession(arxivId, sessionId, db)
  }
  return json({ data: { sessionId } })
}

export async function aiChatRoute(req: Request, client: OpencodeClient, db: Database): Promise<Response> {
  const body = await readJson<{ sessionId?: unknown; message?: unknown; excerpt?: unknown; target?: unknown }>(req)
  if (!body || typeof body !== 'object') throw new ApiError('VALIDATION_FAILED', '请求体必须是对象')
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!sessionId) throw new ApiError('VALIDATION_FAILED', 'sessionId 不能为空')
  if (sessionId.length > MAX_SESSION_ID_CHARS) throw new ApiError('VALIDATION_FAILED', 'sessionId 过长')
  if (!message) throw new ApiError('VALIDATION_FAILED', 'message 不能为空')
  if (message.length > MAX_MESSAGE_CHARS)
    throw new ApiError('VALIDATION_FAILED', `message 不能超过 ${MAX_MESSAGE_CHARS} 字符`)
  const provider = firstOpenaiProvider()
  const target = typeof body.target === 'string' ? body.target.trim() || 'zh' : 'zh'
  if (target.length > 32) throw new ApiError('VALIDATION_FAILED', 'target 过长')
  const excerpt = typeof body.excerpt === 'string' ? body.excerpt.trim() : undefined
  if (excerpt && excerpt.length > MAX_EXCERPT_CHARS)
    throw new ApiError('VALIDATION_FAILED', `excerpt 不能超过 ${MAX_EXCERPT_CHARS} 字符`)
  const text = [
    excerpt ? `Selected excerpt:\n${excerpt}\n` : '',
    `Answer in ${target}.`,
    `Question: ${message}`,
  ]
    .filter(Boolean)
    .join('\n')
  try {
    await client.promptAsync(sessionId, OPENCODE_AGENT, provider.name, provider.model ?? '', text)
  } catch {
    const arxivId = getArxivBySession(sessionId, db)
    if (!arxivId) throw new ApiError('UPSTREAM_FAILED', `opencode prompt failed for ${sessionId}`, 502)
    const newSessionId = await client.createSession(`paper:${arxivId}`)
    setSession(arxivId, newSessionId, db)
    try {
      await client.promptAsync(newSessionId, OPENCODE_AGENT, provider.name, provider.model ?? '', text)
    } catch (e) {
      throw new ApiError('UPSTREAM_FAILED', (e as Error).message, 502)
    }
    return json({ data: { ok: true, sessionId: newSessionId } })
  }
  return json({ data: { ok: true, sessionId } })
}

export async function aiHistoryRoute(req: Request, client: OpencodeClient): Promise<Response> {
  const sessionId = new URL(req.url).searchParams.get('sessionId')
  if (!sessionId) throw new ApiError('VALIDATION_FAILED', 'sessionId 不能为空')
  const raw = (await client.messages(sessionId)) as {
    info?: { role?: string }
    parts?: { type?: string; text?: string }[]
  }[]
  const messages = raw
    .map((m) => ({
      role: m.info?.role === 'user' ? 'user' : 'assistant',
      text: (m.parts ?? []).filter((p) => p.type === 'text').map((p) => p.text ?? '').join(''),
    }))
    .filter((m) => m.text.trim().length > 0)
  return json({ data: { messages } })
}

export async function aiStreamRoute(req: Request, client: OpencodeClient, sessionId: string): Promise<Response> {
  if (!sessionId) throw new ApiError('VALIDATION_FAILED', 'sessionId 不能为空')
  const upstream = await client.eventStream()
  if (!upstream.ok || !upstream.body) {
    throw new ApiError('UPSTREAM_FAILED', `opencode event stream ${upstream.status}`, 502)
  }
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  const controller = new AbortController()
  req.signal.addEventListener('abort', () => controller.abort())
  const stream = new ReadableStream<Uint8Array>({
    async start(streamController) {
      const reader = upstream.body!.getReader()
      controller.signal.addEventListener('abort', () => void reader.cancel().catch(() => {}), { once: true })
      let buffer = ''
      try {
        while (!controller.signal.aborted) {
          const { done, value } = await reader.read()
          if (done) break
          buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n')
          const frames = buffer.split('\n\n')
          buffer = frames.pop() ?? ''
          for (const frame of frames) {
            const line = frame.split('\n').find((l) => l.startsWith('data:'))
            if (!line) continue
            let parsed: unknown
            try {
              parsed = JSON.parse(line.slice(5).trim())
            } catch {
              continue
            }
            const event = normalizeOpencodeEvent(sessionId, parsed as { type?: string; properties?: Record<string, unknown> })
            if (event) streamController.enqueue(encoder.encode(serializeClientEvent(event)))
          }
        }
      } finally {
        await reader.cancel().catch(() => {})
        try {
          streamController.close()
        } catch {
          // stream already closed (client disconnected)
        }
      }
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      // nginx buffers proxied responses by default, which breaks token-by-token
      // streaming on the public site. This header disables it per response.
      'X-Accel-Buffering': 'no',
    },
  })
}

export async function aiAbortRoute(client: OpencodeClient, sessionId: string): Promise<Response> {
  if (!sessionId) throw new ApiError('VALIDATION_FAILED', 'sessionId 不能为空')
  await client.abort(sessionId)
  return json({ data: { ok: true } })
}

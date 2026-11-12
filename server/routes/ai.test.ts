import { test, expect, beforeEach, afterEach } from 'bun:test'
import { openDb } from '../db'
import { getSession, setSession } from '../ai-sessions'
import { aiSessionRoute, aiChatRoute, aiHistoryRoute, aiStreamRoute } from './ai'
import { createOpencodeClient, PAPER_CONTEXT_METADATA_KEY } from '../opencode'
import { saveContent } from '../paper-content'

let db: ReturnType<typeof openDb>
const realFetch = globalThis.fetch

beforeEach(() => {
  db = openDb(':memory:')
  saveContent({
    arxivId: '2401.00001',
    title: 'A loss function for graph models',
    source: 'html',
    sections: [
      { idx: 0, heading: 'Introduction', text: 'We train graph models with a robust loss.' },
      { idx: 1, heading: 'Methods', text: 'The loss is the mean squared error over nodes.' },
    ],
  }, 168, db)
})
afterEach(() => {
  globalThis.fetch = realFetch
  db.close()
})

test('aiSessionRoute creates and persists a session id', async () => {
  const client = createOpencodeClient('http://oc')
  ;(client.createSession as any) = async (title: string) => `new-${title}`
  const res = await aiSessionRoute(
    new Request('http://x/api/ai/session', { method: 'POST', body: JSON.stringify({ arxivId: '2401.00001' }) }),
    db,
    client,
  )
  const body = (await res.json()) as any
  expect(body.data.sessionId).toBe('new-paper:2401.00001')
  expect(getSession('2401.00001', db)).toBe('new-paper:2401.00001')
})

test('aiSessionRoute reuses an existing live session', async () => {
  const client = createOpencodeClient('http://oc')
  let created = 0
  ;(client.createSession as any) = async () => { created += 1; return 'x' }
  ;(client.sessionExists as any) = async () => true
  const make = () => new Request('http://x/api/ai/session', { method: 'POST', body: JSON.stringify({ arxivId: '2401.00008' }) })
  await aiSessionRoute(make(), db, client)
  await aiSessionRoute(make(), db, client)
  expect(created).toBe(1)
})

test('aiSessionRoute recreates a session that no longer exists', async () => {
  const client = createOpencodeClient('http://oc')
  ;(client.sessionExists as any) = async () => false
  ;(client.createSession as any) = async () => 'new-one'
  setSession('2401.00009', 'gone', db)
  const res = await aiSessionRoute(
    new Request('http://x/api/ai/session', { method: 'POST', body: JSON.stringify({ arxivId: '2401.00009' }) }),
    db,
    client,
  )
  const body = (await res.json()) as any
  expect(body.data.sessionId).toBe('new-one')
  expect(getSession('2401.00009', db)).toBe('new-one')
})

test('aiChatRoute supplies the session paper before any agent retrieval', async () => {
  const client = createOpencodeClient('http://oc')
  let sent = ''
  let context = ''
  let fetches = 0
  globalThis.fetch = (async () => { fetches++; throw new Error('no network expected') }) as unknown as typeof fetch
  setSession('2401.00001', 's1', db)
  ;(client.promptAsync as any) = async (_s: string, _a: string, _p: string, _m: string, text: string, supplied: string) => {
    sent = text
    context = supplied
  }
  const prev = Bun.env.LLM_PROVIDERS
  Bun.env.LLM_PROVIDERS = JSON.stringify([{ name: 'mtcode', kind: 'openai', baseUrl: 'http://up/v1', model: 'm' }])
  try {
    const res = await aiChatRoute(
      new Request('http://x/api/ai/chat', {
        method: 'POST',
        // An untrusted request must not select another paper for this session.
        body: JSON.stringify({ sessionId: 's1', message: '论文使用什么损失函数？', excerpt: 'L = ...', target: 'zh', arxivId: '9999.99999' }),
      }),
      client,
      db,
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.data.sessionId).toBe('s1')
    expect(sent).toBe('论文使用什么损失函数？')
    expect(context).toContain('arXiv ID: 2401.00001')
    expect(context).not.toContain('9999.99999')
    expect(context).toContain('A loss function for graph models')
    expect(context).toContain('[Section index 1] Methods')
    expect(context).toContain('mean squared error over nodes')
    expect(context).toContain('L = ...')
    expect(context).toContain('Answer in zh.')
    expect(context).toContain('untrusted source material')
    expect(fetches).toBe(0)
  } finally {
    if (prev === undefined) delete Bun.env.LLM_PROVIDERS
    else Bun.env.LLM_PROVIDERS = prev
  }
})

test('aiChatRoute recreates the session and retries when the prompt fails', async () => {
  const client = createOpencodeClient('http://oc')
  const sentTo: string[] = []
  const contexts: string[] = []
  ;(client.promptAsync as any) = async (s: string, _a: string, _p: string, _m: string, _text: string, context: string) => {
    sentTo.push(s)
    contexts.push(context)
    if (sentTo.length === 1) throw new Error('stale session')
  }
  ;(client.createSession as any) = async () => 'fresh'
  setSession('2401.00001', 'dead', db)
  const prev = Bun.env.LLM_PROVIDERS
  Bun.env.LLM_PROVIDERS = JSON.stringify([{ name: 'mtcode', kind: 'openai', baseUrl: 'http://up/v1', model: 'm' }])
  try {
    const res = await aiChatRoute(
      new Request('http://x/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'dead', message: 'q', target: 'zh' }),
      }),
      client,
      db,
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.data.sessionId).toBe('fresh')
    expect(sentTo).toEqual(['dead', 'fresh'])
    expect(contexts[0]).toContain('mean squared error over nodes')
    expect(contexts[1]).toBe(contexts[0])
    expect(getSession('2401.00001', db)).toBe('fresh')
  } finally {
    if (prev === undefined) delete Bun.env.LLM_PROVIDERS
    else Bun.env.LLM_PROVIDERS = prev
  }
})

test('aiSessionRoute rejects an invalid paper id before creating a session', async () => {
  const client = createOpencodeClient('http://oc')
  let created = false
  ;(client.createSession as any) = async () => { created = true; return 'unexpected' }
  for (const arxivId of ['p1', '../other', '2401.00001?query=other']) {
    await expect(aiSessionRoute(new Request('http://x/api/ai/session', {
      method: 'POST', body: JSON.stringify({ arxivId }),
    }), db, client)).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
  }
  expect(created).toBe(false)
})

test('aiChatRoute rejects unbound and invalid legacy sessions without loading content', async () => {
  const client = createOpencodeClient('http://oc')
  let prompts = 0
  let fetches = 0
  ;(client.promptAsync as any) = async () => { prompts++ }
  globalThis.fetch = (async () => { fetches++; throw new Error('unexpected network') }) as unknown as typeof fetch
  setSession('../invalid', 'legacy', db)
  const prev = Bun.env.LLM_PROVIDERS
  Bun.env.LLM_PROVIDERS = JSON.stringify([{ name: 'mtcode', kind: 'openai', baseUrl: 'http://up/v1', model: 'm' }])
  try {
    for (const sessionId of ['unknown', 'legacy']) {
      await expect(aiChatRoute(new Request('http://x/api/ai/chat', {
        method: 'POST', body: JSON.stringify({ sessionId, message: 'q', target: 'zh' }),
      }), client, db)).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
    }
    expect(prompts).toBe(0)
    expect(fetches).toBe(0)
  } finally {
    if (prev === undefined) delete Bun.env.LLM_PROVIDERS
    else Bun.env.LLM_PROVIDERS = prev
  }
})

test('content load failure sends an explicit limitation without recreating the session', async () => {
  const client = createOpencodeClient('http://oc')
  let sent = ''
  let context = ''
  let created = false
  ;(client.promptAsync as any) = async (_s: string, _a: string, _p: string, _m: string, text: string, supplied: string) => {
    sent = text
    context = supplied
  }
  ;(client.createSession as any) = async () => { created = true; return 'unexpected' }
  globalThis.fetch = (async () => { throw new Error('offline') }) as unknown as typeof fetch
  setSession('2401.12345', 'offline', db)
  const prev = Bun.env.LLM_PROVIDERS
  Bun.env.LLM_PROVIDERS = JSON.stringify([{ name: 'mtcode', kind: 'openai', baseUrl: 'http://up/v1', model: 'm' }])
  try {
    const res = await aiChatRoute(new Request('http://x/api/ai/chat', {
      method: 'POST', body: JSON.stringify({ sessionId: 'offline', message: 'Explain this', excerpt: 'A user-provided passage', target: 'en' }),
    }), client, db)
    expect(res.status).toBe(200)
    expect(created).toBe(false)
    expect(sent).toBe('Explain this')
    expect(context).toContain('arXiv 2401.12345')
    expect(context).toContain('paper text unavailable')
    expect(context).toContain('Do not search the web')
    expect(context).toContain('A user-provided passage')
  } finally {
    if (prev === undefined) delete Bun.env.LLM_PROVIDERS
    else Bun.env.LLM_PROVIDERS = prev
  }
})

test('aiHistoryRoute maps messages to chat items', async () => {
  const client = createOpencodeClient('http://oc')
  ;(client.messages as any) = async () => [
    { info: { role: 'user' }, parts: [{ type: 'text', text: 'hi' }] },
    { info: { role: 'assistant' }, parts: [{ type: 'text', text: 'hello' }] },
  ]
  const res = await aiHistoryRoute(new Request('http://x/api/ai/history?sessionId=s1'), client)
  const body = (await res.json()) as any
  expect(body.data.messages).toEqual([
    { role: 'user', text: 'hi' },
    { role: 'assistant', text: 'hello' },
  ])
})

test('aiHistoryRoute hides only marked synthetic context and preserves the raw question', async () => {
  const client = createOpencodeClient('http://oc')
  const question = 'Question: a literal user heading\nSelected excerpt:\nWhat does this mean?'
  const hidden = { type: 'text', text: 'A very long paper body', synthetic: true, metadata: { [PAPER_CONTEXT_METADATA_KEY]: 1 } }
  ;(client.messages as any) = async () => [
    { info: { role: 'user' }, parts: [hidden, { type: 'text', text: question }] },
    { info: { role: 'user' }, parts: [hidden] },
    { info: { role: 'assistant' }, parts: [{ type: 'text', text: 'Visible synthetic text', synthetic: true }] },
    { info: { role: 'user' }, parts: [{ type: 'text', text: 'Visible marked text', metadata: { [PAPER_CONTEXT_METADATA_KEY]: 1 } }] },
    { info: { role: 'assistant' }, parts: [{ type: 'text', text: 'The answer is $L = 0$.' }] },
  ]
  const res = await aiHistoryRoute(new Request('http://x/api/ai/history?sessionId=s1'), client)
  const body = (await res.json()) as any
  expect(body.data.messages).toEqual([
    { role: 'user', text: question },
    { role: 'assistant', text: 'Visible synthetic text' },
    { role: 'user', text: 'Visible marked text' },
    { role: 'assistant', text: 'The answer is $L = 0$.' },
  ])
})

test('aiStreamRoute disables nginx buffering and forwards text deltas', async () => {
  const client = createOpencodeClient('http://oc')
  const raw = [
    'data: {"type":"message.part.delta","properties":{"sessionID":"s1","field":"text","delta":"hi"}}',
    '',
    'data: {"type":"session.idle","properties":{"sessionID":"s1"}}',
    '',
    '',
  ].join('\n')
  ;(client.eventStream as any) = async () => new Response(raw, { headers: { 'Content-Type': 'text/event-stream' } })
  const res = await aiStreamRoute(new Request('http://x/api/ai/stream?sessionId=s1'), client, 's1')
  expect(res.headers.get('x-accel-buffering')).toBe('no')
  const body = await res.text()
  expect(body).toContain('"type":"text"')
  expect(body).toContain('"text":"hi"')
  expect(body).toContain('"type":"done"')
})

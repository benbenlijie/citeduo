import { test, expect, beforeEach } from 'bun:test'
import { openDb } from '../db'
import { getSession, setSession } from '../ai-sessions'
import { aiSessionRoute, aiChatRoute, aiHistoryRoute, aiStreamRoute } from './ai'
import { createOpencodeClient } from '../opencode'

let db: ReturnType<typeof openDb>

beforeEach(() => { db = openDb(':memory:') })

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
  const make = () => new Request('http://x/api/ai/session', { method: 'POST', body: JSON.stringify({ arxivId: 'p1' }) })
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

test('aiChatRoute forwards the composed prompt to opencode', async () => {
  const client = createOpencodeClient('http://oc')
  let sent = ''
  ;(client.promptAsync as any) = async (_s: string, _a: string, _p: string, _m: string, text: string) => { sent = text }
  const prev = Bun.env.LLM_PROVIDERS
  Bun.env.LLM_PROVIDERS = JSON.stringify([{ name: 'mtcode', kind: 'openai', baseUrl: 'http://up/v1', model: 'm' }])
  try {
    const res = await aiChatRoute(
      new Request('http://x/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 's1', message: 'What is the loss?', excerpt: 'L = ...', target: 'zh' }),
      }),
      client,
      db,
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as any
    expect(body.data.sessionId).toBe('s1')
    expect(sent).toContain('What is the loss?')
    expect(sent).toContain('L = ...')
    expect(sent).toContain('zh')
  } finally {
    if (prev === undefined) delete Bun.env.LLM_PROVIDERS
    else Bun.env.LLM_PROVIDERS = prev
  }
})

test('aiChatRoute recreates the session and retries when the prompt fails', async () => {
  const client = createOpencodeClient('http://oc')
  const sentTo: string[] = []
  ;(client.promptAsync as any) = async (s: string) => {
    sentTo.push(s)
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
    expect(getSession('2401.00001', db)).toBe('fresh')
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

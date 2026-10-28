import { test, expect, afterEach } from 'bun:test'
import { mkdtempSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createOpencodeClient, OpencodeManager, type OpencodeClient } from './opencode'

const realFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = realFetch })

function client(): OpencodeClient {
  return createOpencodeClient('http://127.0.0.1:4096')
}

test('createSession posts to /session and returns the id', async () => {
  let url = ''
  let body: unknown
  let init: RequestInit | undefined
  globalThis.fetch = (async (u: string, i: RequestInit) => {
    url = String(u); body = JSON.parse(String(i.body)); init = i
    return new Response(JSON.stringify({ id: 'sess-1' }), { status: 200 })
  }) as unknown as typeof fetch
  const id = await client().createSession('paper:2401.00001')
  expect(id).toBe('sess-1')
  expect(url).toBe('http://127.0.0.1:4096/session')
  expect(body).toEqual({ title: 'paper:2401.00001' })
  expect(init?.signal).toBeInstanceOf(AbortSignal)
})

test('client sends HTTP Basic auth when a server password is configured', async () => {
  let authorization = ''
  globalThis.fetch = (async (_u: string, i: RequestInit) => {
    authorization = new Headers(i.headers).get('authorization') ?? ''
    return new Response(JSON.stringify({ id: 'sess-1' }), { status: 200 })
  }) as unknown as typeof fetch
  await createOpencodeClient('http://127.0.0.1:4096', 1000, 'secret').createSession('t')
  expect(authorization).toBe(`Basic ${Buffer.from('opencode:secret').toString('base64')}`)
})

test('promptAsync posts the agent, model and text part', async () => {
  let body: any
  globalThis.fetch = (async (_u: string, init: RequestInit) => {
    body = JSON.parse(String(init.body))
    return new Response('', { status: 204 })
  }) as unknown as typeof fetch
  await client().promptAsync('sess-1', 'agent', 'prov', 'model', 'hello')
  expect(body.agent).toBe('agent')
  expect(body.model).toEqual({ providerID: 'prov', modelID: 'model' })
  expect(body.parts).toEqual([{ type: 'text', text: 'hello' }])
})

test('sessionExists GETs /session/:id and reflects the status', async () => {
  const seen: string[] = []
  let ok = true
  globalThis.fetch = (async (u: string) => {
    seen.push(String(u))
    return new Response('', { status: ok ? 200 : 404 })
  }) as unknown as typeof fetch
  expect(await client().sessionExists('sess-9')).toBe(true)
  expect(seen[0]).toBe('http://127.0.0.1:4096/session/sess-9')
  ok = false
  expect(await client().sessionExists('sess-9')).toBe(false)
})

test('messages and abort hit the right paths', async () => {
  const seen: string[] = []
  globalThis.fetch = (async (u: string) => {
    seen.push(String(u))
    return new Response(JSON.stringify([]), { status: 200 })
  }) as unknown as typeof fetch
  await client().messages('sess-1')
  await client().abort('sess-1')
  expect(seen[0]).toBe('http://127.0.0.1:4096/session/sess-1/message')
  expect(seen[1]).toBe('http://127.0.0.1:4096/session/sess-1/abort')
})

test('eventStream returns the raw response body stream', async () => {
  globalThis.fetch = (async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(c) { c.enqueue(new TextEncoder().encode('data: {"type":"x"}\n\n')); c.close() },
    })
    return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
  }) as unknown as typeof fetch
  const res = await client().eventStream()
  expect(res.ok).toBe(true)
  expect(await res.text()).toContain('"type":"x"')
})

test('eventStream does not apply a timeout signal', async () => {
  let init: RequestInit | undefined
  globalThis.fetch = (async (_u: string, i: RequestInit) => {
    init = i
    return new Response('', { status: 200 })
  }) as unknown as typeof fetch
  await client().eventStream()
  expect(init?.signal).toBeUndefined()
})

test('stop() without start() does not delete the runtime dir', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'opencode-test-'))
  const manager = new OpencodeManager({ runtimeDir: dir, baseUrl: 'http://127.0.0.1:4096', port: 4096 })
  try {
    await manager.stop()
    expect(existsSync(dir)).toBe(true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

import { test, expect } from 'bun:test'
import { aiLoginPage, aiLoginRoute } from './ai-login'

test('aiLoginPage is a plain POST form and never embeds a token', async () => {
  const res = aiLoginPage('/papers')
  const html = await res.text()
  expect(res.status).toBe(200)
  expect(html).toContain('method="post"')
  expect(html).toContain('action="/papers/api/ai/login"')
  expect(html).toContain('type="password"')
  expect(html).not.toContain('ai_token')
  expect(res.headers.get('cache-control')).toBe('no-store')
  expect(res.headers.get('referrer-policy')).toBe('no-referrer')
})

test('aiLoginRoute accepts the browser form and sets the AI cookie', async () => {
  const res = await aiLoginRoute(
    new Request('http://x/api/ai/login', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'token=good',
    }),
    'good',
    '/papers',
    true,
  )
  expect(res.status).toBe(303)
  expect(res.headers.get('location')).toBe('/papers/')
  const cookie = res.headers.get('set-cookie') ?? ''
  expect(cookie).toContain('cp_ai=good')
  expect(cookie).toContain('HttpOnly')
  expect(cookie).toContain('Secure')
})

test('aiLoginRoute rejects a wrong form token without a cookie', async () => {
  const res = await aiLoginRoute(
    new Request('http://x/api/ai/login', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'token=bad',
    }),
    'good',
    '/papers',
    false,
  )
  expect(res.status).toBe(401)
  expect(res.headers.get('set-cookie')).toBeNull()
  expect(await res.text()).toContain('口令不正确')
})

test('aiLoginRoute supports JSON clients', async () => {
  const ok = await aiLoginRoute(
    new Request('http://x/api/ai/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ token: 'good' }),
    }),
    'good',
    '',
    false,
  )
  expect(ok.status).toBe(200)
  expect((await ok.json()) as unknown).toEqual({ data: { ok: true } })
  expect(ok.headers.get('set-cookie')).toContain('cp_ai=good')

  const bad = await aiLoginRoute(
    new Request('http://x/api/ai/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ token: 'bad' }),
    }),
    'good',
    '',
    false,
  )
  expect(bad.status).toBe(401)
  expect(bad.headers.get('set-cookie')).toBeNull()
})

import { test, expect, beforeEach } from 'bun:test'
import { openDb } from './db'
import {
  browserFamily,
  captureApiEvent,
  deviceKind,
  ensureUsageContext,
  parseUsageRange,
  recordCapturedEvent,
  recordPageView,
  recordUsageEvent,
  sanitizePagePath,
  sanitizeReferrer,
  usageStats,
  visitorCookieHeader,
} from './analytics'

let db: ReturnType<typeof openDb>

beforeEach(() => {
  db = openDb(':memory:')
})

function req(path = 'http://localhost/', headers: Record<string, string> = {}): Request {
  return new Request(path, { headers })
}

test('page paths drop query strings and tokens, but keep the paper id', () => {
  expect(sanitizePagePath('/read/2610.03710v1?pid=abc&token=secret')).toEqual({
    path: '/read/2610.03710v1',
    paperId: '2610.03710',
  })
  expect(sanitizePagePath('/?paper=5833efb6e64214715c71b8e7e8505aafe711aae9&token=secret')).toEqual({
    path: '/',
    paperId: '5833efb6e64214715c71b8e7e8505aafe711aae9',
  })
  expect(sanitizePagePath('/api/admin/usage')).toBeNull()
  expect(sanitizePagePath('https://evil.test/x')).toBeNull()
  expect(sanitizePagePath('/../etc/passwd')).toEqual({ path: '/etc/passwd' })
})

test('referrers keep origin + path only', () => {
  expect(sanitizeReferrer('https://example.com/a?token=secret#frag')).toBe('https://example.com/a')
  expect(sanitizeReferrer('javascript:alert(1)')).toBeUndefined()
  expect(sanitizeReferrer('')).toBeUndefined()
})

test('browser and device families are coarse, not raw UA strings', () => {
  expect(browserFamily('Mozilla/5.0 Chrome/155 Safari/537.36 Lark/8.2')).toBe('Feishu')
  expect(browserFamily('Mozilla/5.0 Chrome/155 Safari/537.36')).toBe('Chrome')
  expect(browserFamily('Mozilla/5.0 (compatible; bingbot/2.0)')).toBe('Bot')
  expect(deviceKind('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)')).toBe('mobile')
  expect(deviceKind('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('desktop')
})

test('visitor ids are reused, new ones are random and cookie-bound', () => {
  const known = 'a'.repeat(32)
  const existing = ensureUsageContext(req('http://localhost/', { cookie: `cp_vid=${known}` }), { secure: true })
  expect(existing).toMatchObject({ visitorId: known, isNew: false, secure: true })
  expect(visitorCookieHeader(known, true)).toContain('HttpOnly')
  expect(visitorCookieHeader(known, true)).toContain('Secure')

  const fresh = ensureUsageContext(req(), { secure: false })
  expect(fresh?.isNew).toBe(true)
  expect(fresh?.visitorId).toMatch(/^[a-f0-9]{32}$/)
})

test('page views and API events land in the table without raw IP/UA', () => {
  const request = req('http://localhost/', {
    'user-agent': 'Mozilla/5.0 (Macintosh) Chrome/155 Lark/8.2',
  })
  ensureUsageContext(request, { secure: false })
  recordPageView(request, {
    path: '/?paper=p1&token=secret',
    referrer: 'https://example.com/a?token=secret',
  }, db)
  recordUsageEvent(request, { event: 'search', query: 'world model', status: 200 }, db)

  const rows = db.query('select event, path, paper_id, query, referrer, browser, device, status from usage_events order by id').all() as any[]
  expect(rows).toHaveLength(2)
  expect(rows[0]).toMatchObject({
    event: 'page_view',
    path: '/',
    paper_id: 'p1',
    referrer: 'https://example.com/a',
    browser: 'Feishu',
    device: 'desktop',
    status: 200,
  })
  expect(rows[1]).toMatchObject({ event: 'search', query: 'world model', status: 200 })
  expect(JSON.stringify(rows)).not.toContain('127.0.0.1')
  expect(JSON.stringify(rows)).not.toContain('secret')
})

test('captureApiEvent peeks at a clone and leaves the real body intact', async () => {
  const request = new Request('http://localhost/api/search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: 'world model', query_type: 'keyword' }),
  })
  const captured = await captureApiEvent(request)
  expect(captured).toMatchObject({
    event: 'search',
    query: 'world model',
    meta: { queryType: 'keyword' },
  })
  // The route still gets to read the body.
  expect(await request.json()).toEqual({ query: 'world model', query_type: 'keyword' })
})

test('captureApiEvent ignores polling and admin routes', async () => {
  expect(await captureApiEvent(new Request('http://localhost/api/jobs/abc'))).toBeNull()
  expect(await captureApiEvent(new Request('http://localhost/api/llm/status'))).toBeNull()
  expect(await captureApiEvent(new Request('http://localhost/api/admin/usage'))).toBeNull()
})

test('usageStats aggregates visitors, page views and features', () => {
  const request = req('http://localhost/', { 'user-agent': 'Mozilla/5.0 Chrome/155' })
  ensureUsageContext(request, { secure: false })
  recordPageView(request, { path: '/?paper=p1', referrer: 'https://example.com/a' }, db)
  recordUsageEvent(request, { event: 'search', query: 'world model', status: 200 }, db)
  recordUsageEvent(request, { event: 'network', paperId: 'p1', status: 202 }, db)

  const stats = usageStats('7d', db)
  expect(stats.totals.visitors).toBe(1)
  expect(stats.totals.pageViews).toBe(1)
  expect(stats.totals.events).toBe(3)
  expect(stats.totals.newVisitors).toBe(1)
  expect(stats.topPages[0]).toMatchObject({ path: '/', views: 1 })
  expect(stats.topSearches[0]).toMatchObject({ query: 'world model', count: 1 })
  expect(stats.daily).toHaveLength(7)
  expect(stats.events.map((row) => row.event)).toEqual(expect.arrayContaining(['page_view', 'search', 'network']))
})

test('range parsing is strict and defaults to 30 days', () => {
  expect(parseUsageRange('7d')).toEqual({ key: '7d', days: 7 })
  expect(parseUsageRange('90d')).toEqual({ key: '90d', days: 90 })
  expect(parseUsageRange('all')).toEqual({ key: 'all', days: null })
  expect(parseUsageRange(null)).toEqual({ key: '30d', days: 30 })
  expect(parseUsageRange('30 days')).toEqual({ key: '30d', days: 30 })
})

import { test, expect, beforeEach } from 'bun:test'
import { openDb } from './db'
import {
  demoDay,
  demoQuotaResponse,
  getDemoQuotaStatus,
  registerDemoRequest,
  resetDemoQuota,
  type DemoExceeded,
} from './demo-quota'

let database: ReturnType<typeof openDb>
const now = new Date(2026, 9, 27, 12, 0, 0)

beforeEach(() => {
  database = openDb(':memory:')
})

test('request limit allows the cap, blocks the crossing request and alerts once', () => {
  const limits = { requestLimit: 2, visitorLimit: 0 }
  const alerts: DemoExceeded[] = []
  const options = {
    database,
    limits,
    now,
    alert: (_status: unknown, exceeded: DemoExceeded) => { alerts.push(exceeded) },
  }

  const first = registerDemoRequest('visitor-1', options)
  expect(first).toMatchObject({ blocked: false, counted: true, exceeded: null })
  expect(first.status).toMatchObject({ requests: 1, visitors: 1 })

  const second = registerDemoRequest('visitor-2', options)
  expect(second.blocked).toBe(false)
  expect(second.status.requests).toBe(2)

  const third = registerDemoRequest('visitor-3', options)
  expect(third).toMatchObject({ blocked: true, counted: true, exceeded: 'requests' })
  expect(third.status.requests).toBe(3)
  expect(alerts).toEqual(['requests'])

  const fourth = registerDemoRequest('visitor-4', options)
  expect(fourth).toMatchObject({ blocked: true, counted: false, exceeded: 'requests' })
  expect(fourth.status.requests).toBe(3)
  expect(alerts).toEqual(['requests'])
})

test('visitor limit counts a cookie once, not every request', () => {
  const limits = { requestLimit: 0, visitorLimit: 2 }
  const options = { database, limits, now, alert: () => {} }

  expect(registerDemoRequest('visitor-1', options).status).toMatchObject({ requests: 1, visitors: 1 })
  expect(registerDemoRequest('visitor-1', options).status).toMatchObject({ requests: 2, visitors: 1 })
  expect(registerDemoRequest('visitor-2', options).status).toMatchObject({ requests: 3, visitors: 2 })

  const third = registerDemoRequest('visitor-3', options)
  expect(third).toMatchObject({ blocked: true, exceeded: 'visitors' })
  expect(third.status).toMatchObject({ requests: 4, visitors: 3 })
})

test('blockOnLimit=false alerts but keeps serving the rest of the day', () => {
  const limits = { requestLimit: 1, visitorLimit: 0 }
  const alerts: DemoExceeded[] = []
  const options = {
    database,
    limits,
    blockOnLimit: false,
    now,
    alert: (_status: unknown, exceeded: DemoExceeded) => { alerts.push(exceeded) },
  }

  expect(registerDemoRequest('visitor-1', options).blocked).toBe(false)
  const second = registerDemoRequest('visitor-2', options)
  expect(second).toMatchObject({ blocked: false, counted: true, exceeded: 'requests' })
  expect(second.status.blocked).toBe(false)
  expect(alerts).toEqual(['requests'])

  const third = registerDemoRequest('visitor-3', options)
  expect(third).toMatchObject({ blocked: false, counted: true, exceeded: 'requests' })
  expect(alerts).toEqual(['requests'])
})

test('no limits means no counting', () => {
  const limits = { requestLimit: 0, visitorLimit: 0 }
  const decision = registerDemoRequest('visitor-1', { database, limits, now, alert: () => {} })
  expect(decision).toMatchObject({ blocked: false, counted: false, exceeded: null })
  expect(getDemoQuotaStatus({ database, limits, now })).toMatchObject({ requests: 0, visitors: 0 })
})

test('reset clears today and lets the next request through', () => {
  const limits = { requestLimit: 1, visitorLimit: 0 }
  const options = { database, limits, now, alert: () => {} }
  expect(registerDemoRequest('visitor-1', options).blocked).toBe(false)
  expect(registerDemoRequest('visitor-2', options).blocked).toBe(true)

  const reset = resetDemoQuota({ database, limits, now })
  expect(reset).toMatchObject({ requests: 0, visitors: 0, blocked: false })
  expect(registerDemoRequest('visitor-2', options)).toMatchObject({ blocked: false, counted: true })
})

test('status is scoped to the local day', () => {
  const limits = { requestLimit: 5, visitorLimit: 5 }
  registerDemoRequest('visitor-1', { database, limits, now, alert: () => {} })
  expect(demoDay(now)).toBe('2026-10-27')
  expect(getDemoQuotaStatus({ database, limits, now })).toMatchObject({
    day: '2026-10-27',
    requests: 1,
    visitors: 1,
  })
  const nextDay = new Date(2026, 9, 28, 0, 1, 0)
  expect(getDemoQuotaStatus({ database, limits, now: nextDay })).toMatchObject({
    day: '2026-10-28',
    requests: 0,
    visitors: 0,
  })
})

test('quota responses are friendly 429s for HTML and API clients', async () => {
  const limits = { requestLimit: 1, visitorLimit: 0 }
  const options = { database, limits, now, alert: () => {} }
  registerDemoRequest('visitor-1', options)
  const decision = registerDemoRequest('visitor-2', options)
  expect(decision.blocked).toBe(true)

  const api = demoQuotaResponse(decision.status, { api: true })
  expect(api.status).toBe(429)
  expect(api.headers.get('Retry-After')).toMatch(/^\d+$/)
  expect(api.headers.get('Cache-Control')).toBe('no-store')
  const body = await api.json() as any
  expect(body.error.code).toBe('DEMO_QUOTA_EXCEEDED')

  const html = demoQuotaResponse(decision.status, { api: false })
  expect(html.status).toBe(429)
  expect(html.headers.get('Content-Type')).toContain('text/html')
  expect(await html.text()).toContain('今日 Demo 配额已用完')
})

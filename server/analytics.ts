import { randomBytes } from 'node:crypto'
import type { Database } from 'bun:sqlite'
import { cookieValue } from './auth'
import { config } from './config'
import { db } from './db'

/**
 * First-party usage analytics.
 *
 * The app is a token-gated single-tenant tool, so "how many people use it"
 * cannot come from an account system (there isn't one). This module keeps a
 * random visitor cookie, records meaningful actions in the same SQLite file as
 * the rest of the app, and answers aggregate questions from that table.
 *
 * Privacy choices:
 *  - no raw IP address and no raw user agent is stored;
 *  - page-view URLs are reduced to a pathname (query strings are dropped, so
 *    an access token in a URL can never land in the analytics table);
 *  - referrers are reduced to origin + pathname;
 *  - message bodies are never stored; only lengths/query text the operator
 *    already chose to log in `search_queries`.
 */

export const VISITOR_COOKIE = 'cp_vid'
const VISITOR_RE = /^[a-f0-9]{32}$/
const SESSION_WINDOW_MS = 30 * 60 * 1000
const MAX_PATH = 400
const MAX_QUERY = 200
const MAX_REFERRER = 300

export type UsageEventName =
  | 'page_view'
  | 'search'
  | 'details'
  | 'network'
  | 'lineage'
  | 'connect'
  | 'reader_open'
  | 'translate'
  | 'ai_session'
  | 'ai_chat'
  | 'neighbors'

export type UsageRangeKey = '7d' | '30d' | '90d' | 'all'

export interface UsageContext {
  visitorId: string
  sessionId: string
  isNew: boolean
  secure: boolean
}

export interface UsageEventInput {
  event: UsageEventName
  path?: string
  paperId?: string
  query?: string
  referrer?: string
  browser?: string
  device?: string
  status?: number
  meta?: Record<string, string | number | boolean | undefined>
}

export interface CapturedUsageEvent extends UsageEventInput {
  event: UsageEventName
}

export interface DailyPoint {
  date: string
  visitors: number
  sessions: number
  pageViews: number
  events: number
}

export interface UsageStats {
  range: { key: UsageRangeKey; days: number | null; from: string; to: string }
  totals: {
    visitors: number
    sessions: number
    pageViews: number
    events: number
    newVisitors: number
    returningVisitors: number
  }
  today: { visitors: number; sessions: number; pageViews: number; events: number }
  daily: DailyPoint[]
  topPages: { path: string; views: number; visitors: number }[]
  topPapers: { paperId: string; title: string; arxivId: string; views: number; visitors: number }[]
  topSearches: { query: string; count: number; visitors: number }[]
  events: { event: string; count: number; visitors: number }[]
  referrers: { referrer: string; count: number }[]
  browsers: { browser: string; count: number }[]
  devices: { device: string; count: number }[]
  firstEventAt: string | null
  lastEventAt: string | null
}

const contexts = new WeakMap<Request, UsageContext>()
let writeWarningShown = false

function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = value
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text ? text.slice(0, max) : undefined
}

function cleanId(value: unknown): string | undefined {
  const text = cleanText(value, 200)
  if (!text) return undefined
  if (/[\s"'<>]/.test(text)) return undefined
  return text
}

function decodePart(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** Normalise an arXiv id to the versionless form used in `papers.arxiv_id`. */
function normalizeArxiv(value: unknown): string | undefined {
  const id = cleanId(value)
  if (!id) return undefined
  const match = id.match(/(\d{4}\.\d{4,5})(?:v\d+)?/)
  return match ? match[1] : id
}

/** Strip the public mount prefix (`/papers`) from a page path. */
function appPath(pathname: string): string {
  let path = pathname || '/'
  const base = (config.server.basePath || '').replace(/\/+$/, '')
  if (base && (path === base || path.startsWith(`${base}/`))) {
    path = path.slice(base.length) || '/'
  }
  return path.startsWith('/') ? path : `/${path}`
}

export function sanitizePagePath(value: unknown): { path: string; paperId?: string } | null {
  const raw = cleanText(value, 2000)
  if (!raw || !raw.startsWith('/')) return null
  let url: URL
  try {
    url = new URL(raw, 'http://analytics.local')
  } catch {
    return null
  }
  if (url.origin !== 'http://analytics.local') return null

  const path = appPath(url.pathname).slice(0, MAX_PATH)
  if (path.startsWith('/api/')) return null

  const readMatch = path.match(/^\/read\/([^/]+)/)
  const paperId = readMatch
    ? normalizeArxiv(decodePart(readMatch[1]))
    : cleanId(url.searchParams.get('paper')) ?? cleanId(url.searchParams.get('pid'))

  return { path, ...(paperId ? { paperId } : {}) }
}

export function sanitizeReferrer(value: unknown): string | undefined {
  const raw = cleanText(value, 1000)
  if (!raw) return undefined
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    return `${url.origin}${url.pathname}`.slice(0, MAX_REFERRER)
  } catch {
    return undefined
  }
}

export function browserFamily(ua: string): string {
  const value = ua || ''
  // Check bots first: many crawlers dress up with a Safari token.
  if (/bot|crawl|spider|slurp|curl|wget|python|headless|httpclient/i.test(value)) return 'Bot'
  if (/feishu|lark/i.test(value)) return 'Feishu'
  if (/edg\//i.test(value)) return 'Edge'
  if (/opr\//i.test(value)) return 'Opera'
  if (/chrome|crios/i.test(value)) return 'Chrome'
  if (/firefox|fxios/i.test(value)) return 'Firefox'
  if (/safari/i.test(value)) return 'Safari'
  return 'Other'
}

export function deviceKind(ua: string): string {
  const value = ua || ''
  if (/ipad|tablet/i.test(value)) return 'tablet'
  if (/mobile|iphone|ipod|android/i.test(value)) return 'mobile'
  return 'desktop'
}

/** Should this request be given a visitor id / considered for analytics? */
export function isTrackablePath(pathname: string): boolean {
  if (pathname === '/stats' || pathname.startsWith('/api/admin/')) return false
  if (pathname.startsWith('/api/')) return true
  if (pathname.startsWith('/assets/')) return false
  return !/\.(?:js|mjs|css|map|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|otf|eot|txt|xml|json|pdf)$/i.test(pathname)
}

/**
 * Identity is needed even when analytics is off: the public-demo quota counts
 * unique visitor cookies without writing usage events.
 */
export function ensureVisitorIdentity(req: Request, options: { secure: boolean }): UsageContext {
  const existing = contexts.get(req)
  if (existing) return existing

  const raw = cookieValue(req.headers.get('cookie'), VISITOR_COOKIE)
  const valid = raw != null && VISITOR_RE.test(raw)
  const visitorId = valid ? raw : randomBytes(16).toString('hex')
  const context: UsageContext = {
    visitorId,
    sessionId: `${visitorId}:${Math.floor(Date.now() / SESSION_WINDOW_MS)}`,
    isNew: !valid,
    secure: options.secure,
  }
  contexts.set(req, context)
  return context
}

export function ensureUsageContext(req: Request, options: { secure: boolean }): UsageContext | null {
  if (!config.analytics.enabled) return null
  return ensureVisitorIdentity(req, options)
}

function visitorCookiePath(): string {
  const base = (config.server.basePath || '').replace(/\/+$/, '')
  return base ? `${base}/` : '/'
}

export function visitorCookieHeader(visitorId: string, secure: boolean): string {
  const parts = [
    `${VISITOR_COOKIE}=${visitorId}`,
    `Path=${visitorCookiePath()}`,
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=31536000',
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

/** Append the visitor cookie to a response when the id was just created. */
export function attachVisitorCookie(res: Response, context: UsageContext): Response {
  if (!context.isNew) return res
  try {
    res.headers.append('Set-Cookie', visitorCookieHeader(context.visitorId, context.secure))
  } catch {
    // A streaming/immutable response; the next request will retry.
  }
  return res
}

export function recordUsageEvent(req: Request, input: UsageEventInput, database: Database = db): void {
  if (!config.analytics.enabled) return
  const context = contexts.get(req)
  // No middleware context means this is a unit test or a direct route call;
  // don't write to the production database from those paths.
  if (!context) return
  try {
    database.run(
      `insert into usage_events
        (visitor_id, session_id, event, path, paper_id, query, referrer, browser, device, status, meta)
       values (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        context.visitorId,
        context.sessionId,
        input.event,
        input.path ?? null,
        input.paperId ?? null,
        input.query ?? null,
        input.referrer ?? null,
        input.browser ?? null,
        input.device ?? null,
        input.status ?? null,
        JSON.stringify(input.meta ?? {}),
      ],
    )
  } catch (error) {
    if (!writeWarningShown) {
      writeWarningShown = true
      console.warn('[analytics] failed to record event:', error instanceof Error ? error.message : String(error))
    }
  }
}

export function recordPageView(
  req: Request,
  body: { path?: unknown; referrer?: unknown },
  database: Database = db,
): void {
  const parsed = sanitizePagePath(body.path)
  if (!parsed) return
  const ua = req.headers.get('user-agent') ?? ''
  recordUsageEvent(req, {
    event: 'page_view',
    path: parsed.path,
    paperId: parsed.paperId,
    referrer: sanitizeReferrer(body.referrer),
    browser: browserFamily(ua),
    device: deviceKind(ua),
    status: 200,
  }, database)
}

async function requestBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const value = await req.clone().json()
    return value != null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function asNumber(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Turn a request into an event *without* reading the original body: the
 * route still gets its body because we only consume a clone. Returns null for
 * chatty/incidental endpoints (job polling, status checks, admin).
 */
export async function captureApiEvent(req: Request): Promise<CapturedUsageEvent | null> {
  const url = new URL(req.url)
  const p = url.pathname

  if (p === '/api/search' && req.method === 'POST') {
    const body = await requestBody(req)
    const query = cleanText(body.query, MAX_QUERY)
    const queryType = cleanText(body.query_type, 20)
    return {
      event: 'search',
      path: p,
      ...(query ? { query } : {}),
      meta: { ...(queryType ? { queryType } : {}) },
    }
  }

  if (p === '/api/details' && req.method === 'POST') {
    const body = await requestBody(req)
    const paperId = cleanId(body.paper_id)
    return { event: 'details', path: p, ...(paperId ? { paperId } : {}), meta: {} }
  }

  if (p === '/api/network' && req.method === 'POST') {
    const body = await requestBody(req)
    const paperId = cleanId(body.paper_id)
    const depth = asNumber(body.depth)
    const maxNodes = asNumber(body.max_nodes)
    return {
      event: 'network',
      path: p,
      ...(paperId ? { paperId } : {}),
      meta: { ...(depth != null ? { depth } : {}), ...(maxNodes != null ? { maxNodes } : {}) },
    }
  }

  if (p === '/api/lineage' && req.method === 'POST') {
    const body = await requestBody(req)
    const paperId = cleanId(body.paper_id)
    const limit = asNumber(body.limit)
    return { event: 'lineage', path: p, ...(paperId ? { paperId } : {}), meta: { ...(limit != null ? { limit } : {}) } }
  }

  if (p === '/api/connect' && req.method === 'POST') {
    const body = await requestBody(req)
    const fromId = cleanId(body.from_id)
    const toId = cleanId(body.to_id)
    const maxHops = asNumber(body.max_hops)
    return {
      event: 'connect',
      path: p,
      ...(fromId ? { paperId: fromId } : {}),
      meta: {
        ...(toId ? { toId } : {}),
        ...(maxHops != null ? { maxHops } : {}),
        ...(typeof body.live === 'boolean' ? { live: body.live } : {}),
      },
    }
  }

  if (p === '/api/translate' && req.method === 'POST') {
    const body = await requestBody(req)
    const texts = Array.isArray(body.texts) ? body.texts.filter((t): t is string => typeof t === 'string') : []
    const target = cleanText(body.target, 16)
    const provider = cleanText(body.provider, 40)
    return {
      event: 'translate',
      path: p,
      meta: {
        chars: texts.reduce((n, text) => n + text.length, 0),
        texts: texts.length,
        ...(target ? { target } : {}),
        ...(provider ? { provider } : {}),
      },
    }
  }

  if (p === '/api/ai/session' && req.method === 'POST') {
    const body = await requestBody(req)
    const paperId = normalizeArxiv(body.arxivId)
    return { event: 'ai_session', path: p, ...(paperId ? { paperId } : {}), meta: {} }
  }

  if (p === '/api/ai/chat' && req.method === 'POST') {
    const body = await requestBody(req)
    const chars = typeof body.message === 'string' ? body.message.length : 0
    return { event: 'ai_chat', path: p, meta: { chars } }
  }

  const reader = p.match(/^\/api\/reader\/(.+)$/)
  if (reader && req.method === 'GET') {
    const paperId = normalizeArxiv(decodePart(reader[1]))
    return {
      event: 'reader_open',
      path: p,
      ...(paperId ? { paperId } : {}),
      meta: { refresh: url.searchParams.get('refresh') === '1' },
    }
  }

  const neighbors = p.match(/^\/api\/neighbors\/(.+)$/)
  if (neighbors && req.method === 'GET') {
    const paperId = cleanId(decodePart(neighbors[1]))
    return { event: 'neighbors', path: p, ...(paperId ? { paperId } : {}), meta: {} }
  }

  return null
}

export function recordCapturedEvent(
  req: Request,
  captured: CapturedUsageEvent | null,
  status: number,
  database: Database = db,
): void {
  if (!captured) return
  recordUsageEvent(req, { ...captured, status }, database)
}

export function parseUsageRange(value: string | null): { key: UsageRangeKey; days: number | null } {
  if (value === '7d') return { key: '7d', days: 7 }
  if (value === '90d') return { key: '90d', days: 90 }
  if (value === 'all') return { key: 'all', days: null }
  return { key: '30d', days: 30 }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function localDate(offsetDays = 0): string {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const value = new Date(y, m - 1, d, 12, 0, 0, 0)
  value.setDate(value.getDate() + days)
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

/** UTC timestamp for local midnight, `days` calendar days ago (inclusive). */
function sinceFor(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - (days - 1))
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

export function usageStats(range: UsageRangeKey = '30d', database: Database = db): UsageStats {
  const { days } = parseUsageRange(range)
  const since = days == null ? '1970-01-01 00:00:00' : sinceFor(days)

  const all = <T>(sql: string, ...params: (string | number)[]): T[] =>
    database.query(sql).all(...params) as T[]
  const one = <T>(sql: string, ...params: (string | number)[]): T | null =>
    (database.query(sql).get(...params) as T | null) ?? null

  const totalsRow = one<{
    visitors: number
    sessions: number
    pageViews: number
    events: number
  }>(
    `select count(distinct visitor_id) as visitors,
            count(distinct session_id) as sessions,
            coalesce(sum(case when event = 'page_view' then 1 else 0 end), 0) as pageViews,
            count(*) as events
       from usage_events
      where created_at >= ?`,
    since,
  ) ?? { visitors: 0, sessions: 0, pageViews: 0, events: 0 }

  const retention = one<{ newVisitors: number; returningVisitors: number }>(
    `select coalesce(sum(case when first_at >= ? then 1 else 0 end), 0) as newVisitors,
            coalesce(sum(case when first_at <  ? then 1 else 0 end), 0) as returningVisitors
       from (select visitor_id, min(created_at) as first_at from usage_events group by visitor_id)
      where visitor_id in (select visitor_id from usage_events where created_at >= ?)`,
    since,
    since,
    since,
  ) ?? { newVisitors: 0, returningVisitors: 0 }

  const todayRow = one<{
    visitors: number
    sessions: number
    pageViews: number
    events: number
  }>(
    `select count(distinct visitor_id) as visitors,
            count(distinct session_id) as sessions,
            coalesce(sum(case when event = 'page_view' then 1 else 0 end), 0) as pageViews,
            count(*) as events
       from usage_events
      where date(created_at, 'localtime') = date('now', 'localtime')`,
  ) ?? { visitors: 0, sessions: 0, pageViews: 0, events: 0 }

  const dailyRows = all<{
    date: string
    visitors: number
    sessions: number
    pageViews: number
    events: number
  }>(
    `select date(created_at, 'localtime') as date,
            count(distinct visitor_id) as visitors,
            count(distinct session_id) as sessions,
            coalesce(sum(case when event = 'page_view' then 1 else 0 end), 0) as pageViews,
            count(*) as events
       from usage_events
      where created_at >= ?
      group by date
      order by date`,
    since,
  )

  const byDay = new Map(dailyRows.map((row) => [row.date, row]))
  const start = days != null
    ? localDate(-(days - 1))
    : dailyRows[0]?.date ?? localDate(0)
  const end = localDate(0)
  const daily: DailyPoint[] = []
  for (let i = 0; i < 3700; i++) {
    const date = addDays(start, i)
    daily.push(byDay.get(date) ?? { date, visitors: 0, sessions: 0, pageViews: 0, events: 0 })
    if (date >= end) break
  }

  const topPages = all<{ path: string; views: number; visitors: number }>(
    `select path, count(*) as views, count(distinct visitor_id) as visitors
       from usage_events
      where event = 'page_view' and path is not null and path <> '' and created_at >= ?
      group by path
      order by views desc, path asc
      limit 20`,
    since,
  )

  const topPapers = all<{
    paperId: string
    title: string
    arxivId: string
    views: number
    visitors: number
  }>(
    `select e.paper_id as paperId,
            count(*) as views,
            count(distinct e.visitor_id) as visitors,
            coalesce(p.title, '') as title,
            coalesce(p.arxiv_id, '') as arxivId
       from usage_events e
       left join papers p on p.id = e.paper_id or p.arxiv_id = e.paper_id
      where e.paper_id is not null and e.paper_id <> '' and e.created_at >= ?
        and e.event in ('page_view', 'reader_open', 'network')
      group by e.paper_id
      order by views desc, e.paper_id asc
      limit 20`,
    since,
  )

  const topSearches = all<{ query: string; count: number; visitors: number }>(
    `select trim(query) as query, count(*) as count, count(distinct visitor_id) as visitors
       from usage_events
      where event = 'search' and query is not null and trim(query) <> '' and created_at >= ?
      group by lower(trim(query))
      order by count desc, query asc
      limit 20`,
    since,
  )

  const events = all<{ event: string; count: number; visitors: number }>(
    `select event, count(*) as count, count(distinct visitor_id) as visitors
       from usage_events
      where created_at >= ?
      group by event
      order by count desc`,
    since,
  )

  const referrers = all<{ referrer: string; count: number }>(
    `select referrer, count(*) as count
       from usage_events
      where event = 'page_view' and referrer is not null and referrer <> '' and created_at >= ?
      group by referrer
      order by count desc
      limit 20`,
    since,
  )

  const browsers = all<{ browser: string; count: number }>(
    `select coalesce(browser, 'Unknown') as browser, count(*) as count
       from usage_events
      where event = 'page_view' and created_at >= ?
      group by browser
      order by count desc`,
    since,
  )

  const devices = all<{ device: string; count: number }>(
    `select coalesce(device, 'Unknown') as device, count(*) as count
       from usage_events
      where event = 'page_view' and created_at >= ?
      group by device
      order by count desc`,
    since,
  )

  const firstLast = one<{ firstEventAt: string | null; lastEventAt: string | null }>(
    `select min(created_at) as firstEventAt, max(created_at) as lastEventAt from usage_events`,
  ) ?? { firstEventAt: null, lastEventAt: null }

  return {
    range: {
      key: range,
      days,
      from: days != null ? localDate(-(days - 1)) : daily[0]?.date ?? localDate(0),
      to: end,
    },
    totals: {
      visitors: Number(totalsRow.visitors) || 0,
      sessions: Number(totalsRow.sessions) || 0,
      pageViews: Number(totalsRow.pageViews) || 0,
      events: Number(totalsRow.events) || 0,
      newVisitors: Number(retention.newVisitors) || 0,
      returningVisitors: Number(retention.returningVisitors) || 0,
    },
    today: {
      visitors: Number(todayRow.visitors) || 0,
      sessions: Number(todayRow.sessions) || 0,
      pageViews: Number(todayRow.pageViews) || 0,
      events: Number(todayRow.events) || 0,
    },
    daily,
    topPages: topPages.map((row) => ({ ...row, views: Number(row.views), visitors: Number(row.visitors) })),
    topPapers: topPapers.map((row) => ({ ...row, views: Number(row.views), visitors: Number(row.visitors) })),
    topSearches: topSearches.map((row) => ({ ...row, count: Number(row.count), visitors: Number(row.visitors) })),
    events: events.map((row) => ({ ...row, count: Number(row.count), visitors: Number(row.visitors) })),
    referrers: referrers.map((row) => ({ ...row, count: Number(row.count) })),
    browsers: browsers.map((row) => ({ ...row, count: Number(row.count) })),
    devices: devices.map((row) => ({ ...row, count: Number(row.count) })),
    firstEventAt: firstLast.firstEventAt,
    lastEventAt: firstLast.lastEventAt,
  }
}

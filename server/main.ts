import { config } from './config'
import { json, handleError, ApiError } from './errors'
import { recoverJobs } from './jobs'
import { searchRoute } from './routes/search'
import { detailsRoute } from './routes/details'
import { networkRoute } from './routes/network'
import { jobRoute } from './routes/jobs'
import { translateRoute } from './routes/translate'
import { llmStatusRoute } from './routes/llm'
import { aiSessionRoute, aiChatRoute, aiHistoryRoute, aiStreamRoute, aiAbortRoute } from './routes/ai'
import { neighborsRoute } from './routes/neighbors'
import { lineageRoute } from './routes/lineage'
import { connectRoute } from './routes/connect'
import { paperSearchRoute, paperSectionRoute } from './routes/paper'
import { readerRoute } from './routes/reader'
import { INTERNAL_TOKEN } from './internal-token'
import { db } from './db'
import { randomUUID } from 'node:crypto'
import { createOpencodeClient, OpencodeManager, opencodeAuthHeaders } from './opencode'
import { join } from 'node:path'
import {
  adminCookieHeader,
  cookieHeader,
  extractToken,
  isAdminAuthorized,
  isAiAuthorized,
  safeEqual,
  withBasePath,
} from './auth'
import { createApiPipeline } from './api-pipeline'
import { aiLoginPage, aiLoginRoute } from './ai-login'
import { attachVisitorCookie, captureApiEvent, ensureVisitorIdentity, isTrackablePath, recordCapturedEvent } from './analytics'
import { demoQuotaEnabled, demoQuotaResponse, registerDemoRequest } from './demo-quota'
import { demoQuotaResetRoute, demoQuotaRoute, demoQuotaTestEmailRoute } from './routes/demo'
import { analyticsPageViewRoute } from './routes/analytics'
import { usageRoute } from './routes/usage'
import { renderStatsPage } from './stats-page'

const WEB_DIST = new URL('../academic-paper-explorer/dist', import.meta.url).pathname

const ACCESS_TOKEN = config.server.accessToken
// The AI assistant is gated separately so a public reading instance can stay
// open while only token holders spend LLM calls. AI_ACCESS_TOKEN wins; when it
// is absent the app token is reused. Neither present => assistant disabled.
const AI_TOKEN = config.ai.accessToken ?? ACCESS_TOKEN
// The reader's translation flow is chatty by design: one small /api/translate
// request per block batch plus a provider-status poll, scaling with document
// size. Exempting these keeps a large paper from tripping the generic per-IP
// limiter; the provider and per-request size caps still bound the work.
const RATE_LIMIT_EXEMPT = ['/api/paper/session/', '/api/translate', '/api/llm/status']

// The stats page is read-only but contains search terms and paper titles, so
// it can have its own password. When ADMIN_TOKEN is absent it shares the app
// token, which keeps the single-token deployment working unchanged.
const ADMIN_TOKEN = config.server.adminToken
const ADMIN_EXPECTED = ADMIN_TOKEN ?? ACCESS_TOKEN

/** `/stats` and every future admin API share one auth gate. */
function isAdminPath(pathname: string): boolean {
  return pathname === '/stats' || pathname.startsWith('/api/admin/')
}

if (config.demo.public && !ADMIN_TOKEN) {
  console.warn('[demo] DEMO_PUBLIC=1 without ADMIN_TOKEN: /stats and /api/admin/* will return 503')
}
if (config.demo.public && config.demo.requestLimit <= 0 && config.demo.visitorLimit <= 0) {
  console.warn('[demo] DEMO_PUBLIC=1 without DEMO_DAILY_*_LIMIT: public traffic is unbounded')
}
if (config.demo.requestLimit > 0 || config.demo.visitorLimit > 0) {
  console.log(
    `[demo] daily budget: requests=${config.demo.requestLimit || '∞'} visitors=${config.demo.visitorLimit || '∞'} block=${config.demo.blockOnLimit ? 'on' : 'off'}`,
  )
}

function isSecureRequest(req: Request, url: URL): boolean {
  return url.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https'
}

function statsPageResponse(): Response {
  return new Response(renderStatsPage(), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function adminLoginRedirect(req: Request, url: URL): Response | null {
  if (!ADMIN_EXPECTED) return null
  const token = url.searchParams.get('token')
  if (!token || !safeEqual(token, ADMIN_EXPECTED)) return null
  const clean = new URL(url)
  clean.searchParams.delete('token')
  const headers = new Headers({
    Location: withBasePath(config.server.basePath, clean.pathname, clean.search),
  })
  const secure = isSecureRequest(req, url)
  headers.append('Set-Cookie', adminCookieHeader(ADMIN_EXPECTED, secure))
  // With no separate admin password the two tokens are the same; setting the
  // app cookie too means a stats-first login does not bounce on app links.
  if (!ADMIN_TOKEN && ACCESS_TOKEN) headers.append('Set-Cookie', cookieHeader(ACCESS_TOKEN, secure))
  return new Response(null, { status: 302, headers })
}

function errorStatus(error: unknown): number {
  return error instanceof ApiError ? error.status : 500
}

function unauthorized(): Response {
  const body = `<!doctype html><meta charset="utf-8"><title>需要访问口令</title>
<body style="font-family:system-ui;background:#111827;color:#e5e7eb;padding:3rem">
<h2>需要访问口令</h2>
<p>请在地址后加上 <code>?token=你的口令</code> 打开一次，之后会记住（Cookie）。</p>
</body>`
  return new Response(body, { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

function aiUnavailable(): Response {
  return json(
    { error: { code: 'LLM_UNAVAILABLE', message: 'AI 问答未启用或未配置访问口令' } },
    503,
  )
}

function unauthorizedAi(): Response {
  return json(
    {
      error: {
        code: 'UNAUTHORIZED',
        message: `需要 AI 访问口令：请打开 ${withBasePath(config.server.basePath, '/ai-login')} 输入口令，或使用 Authorization: Bearer / x-ai-token`,
      },
    },
    401,
  )
}

function safeRequestIp(req: Request): string {
  try {
    return server.requestIP(req)?.address ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

async function serveStatic(pathname: string): Promise<Response> {
  const safe = pathname === '/' ? '/index.html' : pathname
  if (safe.includes('..')) return json({ error: { code: 'VALIDATION_FAILED', message: 'bad path' } }, 400)
  let file = Bun.file(WEB_DIST + safe)
  if (!(await file.exists())) file = Bun.file(WEB_DIST + '/index.html') // SPA fallback
  if (!(await file.exists())) return json({ error: { code: 'INTERNAL_SERVER_ERROR', message: "frontend not built (run 'bun run build:web')" } }, 404)
  return new Response(file)
}

recoverJobs()

const externalBase = config.ai.externalBaseUrl
const opencodeBase = externalBase || `http://127.0.0.1:${config.ai.port}`
// Local spawn gets a per-boot random password even when the operator did not
// set one. External opencode (e.g. a container) must be given the same password
// through OPENCODE_SERVER_PASSWORD; without it we refuse to disable the auth
// gate rather than talk to an unauthenticated agent API.
const localPassword = config.ai.serverPassword || randomUUID()
const opencodePassword = externalBase ? config.ai.serverPassword : localPassword
const aiUsable = config.ai.enabled && !!AI_TOKEN && !!opencodePassword
const opencodeManager =
  aiUsable && !externalBase
    ? new OpencodeManager({
        runtimeDir: join(import.meta.dir, '../data/opencode-runtime'),
        baseUrl: opencodeBase,
        port: config.ai.port,
        password: localPassword,
      })
    : null
const opencodeClient = createOpencodeClient(opencodeBase, 120000, opencodePassword)

if (config.ai.enabled && !AI_TOKEN) {
  console.warn('[ai] AI_ACCESS_TOKEN/ACCESS_TOKEN is not set: AI endpoints are disabled')
}
if (config.ai.enabled && externalBase && !config.ai.serverPassword) {
  console.warn('[opencode] external opencode requires OPENCODE_SERVER_PASSWORD: AI is disabled')
}

let aiHealthAt = 0
let aiHealthy = false
async function aiAvailable(): Promise<boolean> {
  if (!aiUsable) return false
  if (opencodeManager) return opencodeManager.isHealthy()
  const now = Date.now()
  if (now - aiHealthAt < 5000) return aiHealthy
  aiHealthAt = now
  try {
    const res = await fetch(`${opencodeBase}/global/health`, {
      headers: opencodeAuthHeaders(opencodePassword),
      signal: AbortSignal.timeout(2500),
    })
    aiHealthy = res.ok
  } catch {
    aiHealthy = false
  }
  return aiHealthy
}

if (opencodeManager) {
  opencodeManager.start().catch((e) => {
    // The assistant is optional, so a missing binary belongs in one calm line,
    // not as the stack trace that greets a first `docker run`.
    console.warn(`[opencode] assistant unavailable: ${e instanceof Error ? e.message : String(e)}`)
  })
  const shutdown = async () => {
    try {
      await opencodeManager.stop()
    } finally {
      process.exit(0)
    }
  }
  process.on('SIGINT', () => void shutdown())
  process.on('SIGTERM', () => void shutdown())
}

async function dispatchApi(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const p = url.pathname
  if (p.startsWith('/api/ai/') && !(await aiAvailable())) {
    throw new ApiError('LLM_UNAVAILABLE', 'AI 服务不可用，请稍后重试', 503)
  }

  if (p === '/api/analytics/pageview' && req.method === 'POST') return await analyticsPageViewRoute(req)
  if (p === '/api/search' && req.method === 'POST') return await searchRoute(req)
  if (p === '/api/details' && req.method === 'POST') return await detailsRoute(req)
  if (p === '/api/network' && req.method === 'POST') return await networkRoute(req)
  if (p === '/api/lineage' && req.method === 'POST') return await lineageRoute(req)
  if (p === '/api/connect' && req.method === 'POST') return await connectRoute(req)
  if (p === '/api/translate' && req.method === 'POST') return await translateRoute(req)
  if (p === '/api/ai/session' && req.method === 'POST') return await aiSessionRoute(req, db, opencodeClient)
  if (p === '/api/ai/chat' && req.method === 'POST') return await aiChatRoute(req, opencodeClient, db)
  if (p === '/api/ai/history' && req.method === 'GET') return await aiHistoryRoute(req, opencodeClient)
  if (p === '/api/ai/abort' && req.method === 'POST') {
    const sessionId = url.searchParams.get('sessionId') ?? ''
    return await aiAbortRoute(opencodeClient, sessionId)
  }
  if (p === '/api/ai/stream' && req.method === 'GET') {
    const sessionId = url.searchParams.get('sessionId') ?? ''
    return await aiStreamRoute(req, opencodeClient, sessionId)
  }
  if (p === '/api/llm/status' && req.method === 'GET') return await llmStatusRoute()
  if (p.startsWith('/api/jobs/') && req.method === 'GET') return await jobRoute(req, p.split('/').pop()!)
  if (p.startsWith('/api/neighbors/') && req.method === 'GET') return await neighborsRoute(p.split('/').pop()!)
  if (p.startsWith('/api/reader/') && req.method === 'GET') {
    return await readerRoute(req, decodeURIComponent(p.slice('/api/reader/'.length)), db)
  }
  if (p.startsWith('/api/paper/session/') && p.endsWith('/search') && req.method === 'GET') {
    return await paperSearchRoute(req, db, INTERNAL_TOKEN)
  }
  const sectionMatch = p.match(/^\/api\/paper\/session\/([^/]+)\/section\/(\d+)$/)
  if (sectionMatch && req.method === 'GET') {
    return await paperSectionRoute(req, sectionMatch[1], Number(sectionMatch[2]), db, INTERNAL_TOKEN)
  }
  throw new ApiError('VALIDATION_FAILED', `未知接口: ${p}`, 404)
}

const handleApi = createApiPipeline({
  rateLimitPerMin: config.server.rateLimitPerMin,
  trustProxy: config.server.trustProxy,
  requestIp: safeRequestIp,
  rateLimitExempt: RATE_LIMIT_EXEMPT,
  dispatch: async (req) => {
    // Consume a clone before the route reads the real body. Failure to parse
    // analytics must never fail the user's request.
    let captured: Awaited<ReturnType<typeof captureApiEvent>> = null
    try {
      captured = await captureApiEvent(req)
    } catch {
      captured = null
    }
    try {
      const res = await dispatchApi(req)
      recordCapturedEvent(req, captured, res.status)
      return res
    } catch (error) {
      recordCapturedEvent(req, captured, errorStatus(error))
      throw error
    }
  },
})

let server: ReturnType<typeof Bun.serve>
server = Bun.serve({
  port: config.server.port,
  hostname: config.server.hostname,
  // SSE (/api/ai/stream) is long-lived; the 10s default idle timeout
  // silently kills it mid-turn.
  idleTimeout: 120,
  async fetch(req) {
    const url = new URL(req.url)
    const p = url.pathname
    try {
      if (req.method === 'OPTIONS') return new Response(null, { status: 204 })
      const secure = isSecureRequest(req, url)

      // The login form and its POST target must be reachable before either auth
      // gate: the browser has no cookie yet. The form body carries the token;
      // nothing is ever put in the URL.
      if (p === '/ai-login' && req.method === 'GET') {
        if (!aiUsable || !AI_TOKEN) return aiUnavailable()
        return aiLoginPage(config.server.basePath)
      }
      if (p === '/api/ai/login' && req.method === 'POST') {
        if (!aiUsable || !AI_TOKEN) return aiUnavailable()
        const res = await aiLoginRoute(req, AI_TOKEN, config.server.basePath, secure)
        // Single-token deployments also gate the pages with ACCESS_TOKEN. Set
        // the app cookie as well so the post-login redirect does not bounce.
        if ((res.status === 200 || res.status === 303) && ACCESS_TOKEN && AI_TOKEN === ACCESS_TOKEN) {
          res.headers.append('Set-Cookie', cookieHeader(ACCESS_TOKEN, secure))
        }
        return res
      }

      const adminPath = isAdminPath(p)

      // The reader stays public; the agent does not. Fail closed when no AI
      // token is configured. Browser logins arrive as the cp_ai cookie set by
      // the POST above; API clients use Bearer or x-ai-token.
      if (p.startsWith('/api/ai/')) {
        if (!aiUsable) return aiUnavailable()
        if (!isAiAuthorized(req.headers, AI_TOKEN)) return unauthorizedAi()
      }

      if (adminPath) {
        if (config.demo.public && !ADMIN_TOKEN) {
          return new Response('Public demo requires ADMIN_TOKEN for the dashboard and admin APIs.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
          })
        }
        if (!isAdminAuthorized(req.headers, url, ADMIN_EXPECTED)) return unauthorized()
        if (p === '/stats') {
          const redirect = adminLoginRedirect(req, url)
          if (redirect) return redirect
        }
      } else if (ACCESS_TOKEN && !p.startsWith('/api/paper/session/')) {
        const { token, fromQuery } = extractToken(req.headers, url)
        if (fromQuery && token && safeEqual(token, ACCESS_TOKEN)) {
          const clean = new URL(url)
          clean.searchParams.delete('token')
          return new Response(null, {
            status: 302,
            headers: {
              Location: withBasePath(config.server.basePath, clean.pathname, clean.search),
              'Set-Cookie': cookieHeader(ACCESS_TOKEN, secure),
            },
          })
        }
        if (!token || !safeEqual(token, ACCESS_TOKEN)) return unauthorized()
      }

      const adminBypass = ADMIN_EXPECTED != null && isAdminAuthorized(req.headers, url, ADMIN_EXPECTED)
      const tracked = isTrackablePath(p)
      // Internal retrieval calls carry the internal token, not a public cookie;
      // they should not burn the demo budget while an admin uses the assistant.
      const quotaCounted = tracked && !p.startsWith('/api/paper/session/')
      const wantIdentity = (tracked && config.analytics.enabled) || (quotaCounted && demoQuotaEnabled())
      const identity = wantIdentity ? ensureVisitorIdentity(req, { secure }) : null

      if (quotaCounted && demoQuotaEnabled() && !adminBypass) {
        const decision = registerDemoRequest(identity?.visitorId ?? null)
        if (decision.blocked) {
          const limited = demoQuotaResponse(decision.status, { api: p.startsWith('/api/') })
          return identity ? attachVisitorCookie(limited, identity) : limited
        }
      }

      let res: Response
      if (p === '/stats') res = statsPageResponse()
      else if (p === '/api/admin/usage') res = usageRoute(url)
      else if (p === '/api/admin/demo-quota' && req.method === 'GET') res = demoQuotaRoute()
      else if (p === '/api/admin/demo-quota/reset' && req.method === 'POST') res = demoQuotaResetRoute()
      else if (p === '/api/admin/demo-quota/test-email' && req.method === 'POST') res = await demoQuotaTestEmailRoute()
      else if (p.startsWith('/api/')) res = await handleApi(req)
      else res = await serveStatic(p)

      return identity ? attachVisitorCookie(res, identity) : res
    } catch (e) {
      return handleError(e)
    }
  },
})

console.log(`CiteDuo local server → http://${server.hostname}:${server.port}`)

import type { Database } from 'bun:sqlite'
import { config } from './config'
import { db } from './db'

/**
 * Public-demo budget.
 *
 * A GitHub demo has no account system, so the only practical cost guard is a
 * daily, instance-wide budget: count the first visit from each anonymous cookie
 * and every HTML/API request; once either cap is crossed, refuse the rest of the
 * day. Static assets are not counted (one page load would otherwise consume a
 * dozen slots), but once the day is blocked every public page/API request is
 * refused.
 *
 * The daily row and visitor set live in SQLite so a restart cannot reset the
 * budget. `/api/admin/demo-quota` exposes the state, and its `reset` endpoint is
 * the emergency "let people back in" switch.
 */

export type DemoExceeded = 'requests' | 'visitors'

export interface DemoLimits {
  requestLimit: number
  visitorLimit: number
}

export interface DemoQuotaStatus {
  day: string
  requests: number
  visitors: number
  requestLimit: number
  visitorLimit: number
  blocked: boolean
  alertedAt: string | null
  resetAt: string
  exceeded: DemoExceeded | null
}

export interface DemoQuotaDecision {
  status: DemoQuotaStatus
  blocked: boolean
  exceeded: DemoExceeded | null
  counted: boolean
}

export interface DemoQuotaOptions {
  database?: Database
  limits?: DemoLimits
  blockOnLimit?: boolean
  now?: Date
  /** Tests inject a no-op so they never touch the network. */
  alert?: (status: DemoQuotaStatus, exceeded: DemoExceeded) => void | Promise<void>
}

interface DemoRow {
  day: string
  requests: number
  visitors: number
  blocked: number
  alerted_at: string | null
}

let writeWarningShown = false

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Local calendar day, matching the dashboard's `localtime` grouping. */
export function demoDay(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function demoResetAt(now = new Date()): string {
  const next = new Date(now.getTime())
  next.setHours(24, 0, 0, 0)
  return next.toISOString()
}

export function demoLimits(): DemoLimits {
  return { requestLimit: config.demo.requestLimit, visitorLimit: config.demo.visitorLimit }
}

export function demoQuotaEnabled(limits = demoLimits()): boolean {
  return limits.requestLimit > 0 || limits.visitorLimit > 0
}

function exceededFor(row: DemoRow, limits: DemoLimits): DemoExceeded | null {
  if (limits.requestLimit > 0 && row.requests > limits.requestLimit) return 'requests'
  if (limits.visitorLimit > 0 && row.visitors > limits.visitorLimit) return 'visitors'
  return null
}

function emptyRow(day: string): DemoRow {
  return { day, requests: 0, visitors: 0, blocked: 0, alerted_at: null }
}

function statusFor(row: DemoRow, limits: DemoLimits, now: Date): DemoQuotaStatus {
  return {
    day: row.day,
    requests: Number(row.requests) || 0,
    visitors: Number(row.visitors) || 0,
    requestLimit: limits.requestLimit,
    visitorLimit: limits.visitorLimit,
    blocked: row.blocked !== 0,
    alertedAt: row.alerted_at,
    resetAt: demoResetAt(now),
    exceeded: exceededFor(row, limits),
  }
}

function readRow(database: Database, day: string): DemoRow | null {
  return (database.query('select day, requests, visitors, blocked, alerted_at from demo_daily where day = ?').get(day) as DemoRow | null) ?? null
}

export function getDemoQuotaStatus(options: Omit<DemoQuotaOptions, 'alert'> = {}): DemoQuotaStatus {
  const database = options.database ?? db
  const limits = options.limits ?? demoLimits()
  const now = options.now ?? new Date()
  const day = demoDay(now)
  return statusFor(readRow(database, day) ?? emptyRow(day), limits, now)
}

/**
 * Count one public request. Returns the post-increment status; `blocked` tells
 * the caller to answer 429. A failure to write fails open (and logs) rather than
 * turning a quota-table problem into an outage.
 */
export function registerDemoRequest(visitorId: string | null, options: DemoQuotaOptions = {}): DemoQuotaDecision {
  const database = options.database ?? db
  const limits = options.limits ?? demoLimits()
  const blockOnLimit = options.blockOnLimit ?? config.demo.blockOnLimit
  const now = options.now ?? new Date()
  const day = demoDay(now)

  if (!demoQuotaEnabled(limits)) {
    return {
      status: getDemoQuotaStatus({ database, limits, now }),
      blocked: false,
      exceeded: null,
      counted: false,
    }
  }

  try {
    const existing = readRow(database, day)
    if (existing?.blocked) {
      const status = statusFor(existing, limits, now)
      return { status, blocked: true, exceeded: status.exceeded, counted: false }
    }

    let wasAlerted = existing?.alerted_at != null
    database.transaction(() => {
      database.run(
        `insert into demo_daily (day, requests, visitors, updated_at)
         values (?, 1, 0, datetime('now'))
         on conflict(day) do update set requests = requests + 1, updated_at = datetime('now')`,
        [day],
      )
      if (visitorId) {
        const inserted = database.run(
          'insert or ignore into demo_visitors (day, visitor_id) values (?, ?)',
          [day, visitorId],
        )
        if (inserted.changes > 0) {
          database.run('update demo_daily set visitors = visitors + 1 where day = ?', [day])
        }
      }

      const row = readRow(database, day)
      if (row && exceededFor(row, limits)) {
        if (!wasAlerted) {
          database.run("update demo_daily set alerted_at = datetime('now') where day = ?", [day])
        }
        if (blockOnLimit) {
          database.run('update demo_daily set blocked = 1 where day = ?', [day])
        }
      }
    })()

    const row = readRow(database, day)
    if (!row) throw new Error('demo quota row missing after insert')
    const status = statusFor(row, limits, now)
    const exceeded = status.exceeded
    if (exceeded && !wasAlerted) {
      const alert = options.alert ?? sendDemoAlert
      void Promise.resolve(alert(status, exceeded)).catch((error) => {
        console.warn('[demo-quota] alert failed:', error instanceof Error ? error.message : String(error))
      })
    }
    return { status, blocked: status.blocked, exceeded, counted: true }
  } catch (error) {
    if (!writeWarningShown) {
      writeWarningShown = true
      console.warn('[demo-quota] failed to record request:', error instanceof Error ? error.message : String(error))
    }
    return {
      status: getDemoQuotaStatus({ database, limits, now }),
      blocked: false,
      exceeded: null,
      counted: false,
    }
  }
}

/** Emergency reset for the current day. Protected by the admin token. */
export function resetDemoQuota(options: Omit<DemoQuotaOptions, 'alert'> = {}): DemoQuotaStatus {
  const database = options.database ?? db
  const now = options.now ?? new Date()
  const day = demoDay(now)
  database.transaction(() => {
    database.run('delete from demo_visitors where day = ?', [day])
    database.run('delete from demo_daily where day = ?', [day])
  })()
  return getDemoQuotaStatus({ database, limits: options.limits, now })
}

function alertText(status: DemoQuotaStatus, exceeded: DemoExceeded): string {
  const reason = exceeded === 'visitors' ? '访客数' : '请求量'
  const reset = new Date(status.resetAt).toLocaleString('zh-CN', { hour12: false })
  const visitorLimit = status.visitorLimit > 0 ? status.visitorLimit : '∞'
  const requestLimit = status.requestLimit > 0 ? status.requestLimit : '∞'
  return `[CiteDuo demo] ${status.day} 的${reason}已超过上限：访客 ${status.visitors}/${visitorLimit}，请求 ${status.requests}/${requestLimit}。当天剩余公开请求将暂停，${reset} 自动重置。`
}

/** Log always (journald) and optionally push to a Slack/Discord/Feishu webhook. */
export async function sendDemoAlert(status: DemoQuotaStatus, exceeded: DemoExceeded): Promise<void> {
  const text = alertText(status, exceeded)
  console.warn('[demo-quota] ALERT', text)

  const webhook = config.demo.alertWebhook
  if (!webhook) return

  const format = config.demo.alertFormat
  const payload = format === 'slack'
    ? { text }
    : format === 'discord'
      ? { content: text }
      : format === 'feishu'
        ? { msg_type: 'text', content: { text } }
        : {
            text,
            day: status.day,
            requests: status.requests,
            visitors: status.visitors,
            requestLimit: status.requestLimit,
            visitorLimit: status.visitorLimit,
            exceeded,
          }

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) console.warn(`[demo-quota] webhook returned ${res.status}`)
  } catch (error) {
    console.warn('[demo-quota] webhook failed:', error instanceof Error ? error.message : String(error))
  }
}

/** Friendly 429 for the rest of the day. */
export function demoQuotaResponse(status: DemoQuotaStatus, options: { api: boolean }): Response {
  const reason = status.exceeded === 'visitors' ? '访客数' : status.exceeded === 'requests' ? '请求量' : '访问配额'
  const reset = new Date(status.resetAt).toLocaleString('zh-CN', { hour12: false })
  const retryAfter = Math.max(1, Math.ceil((new Date(status.resetAt).getTime() - Date.now()) / 1000))
  const message = `今日 demo 的${reason}已达上限，${reset} 后自动恢复。`
  const headers = {
    'Cache-Control': 'no-store',
    'Retry-After': String(retryAfter),
  }

  if (options.api) {
    return new Response(JSON.stringify({
      error: { code: 'DEMO_QUOTA_EXCEEDED', message },
      data: status,
    }), {
      status: 429,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }

  const html = `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>今日 Demo 配额已用完</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1120;color:#e5e7eb;font:15px/1.6 system-ui,-apple-system,"Segoe UI","PingFang SC",sans-serif}
main{max-width:560px;padding:40px 28px;border:1px solid #1e293b;border-radius:18px;background:#0f172a}
h1{font-size:24px;margin:0 0 12px;letter-spacing:-.02em}
p{color:#94a3b8;margin:8px 0}
b{color:#e5e7eb}
a{color:#7dd3fc}
</style></head>
<body><main>
<h1>今日 Demo 配额已用完</h1>
<p>${message}</p>
<p>今天已有 <b>${status.visitors}</b> 位访客、<b>${status.requests}</b> 次页面/API 请求。</p>
<p>这是公开 demo 的成本保护，不是你的问题。明天会自动恢复；如果你在本地运行 CiteDuo，则不受这个限制。</p>
<p><a href="https://github.com/benbenlijie/citeduo">在 GitHub 查看项目 / 自行部署</a></p>
</main></body></html>`
  return new Response(html, {
    status: 429,
    headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

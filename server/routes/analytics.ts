import { json, readJson } from '../errors'
import { recordClientEvent, recordPageView } from '../analytics'

/**
 * `POST /api/analytics/pageview` — the SPA calls this on every client-side
 * route change because those navigations never hit the server's static file
 * handler. The body is tiny ({ path, referrer }); all sanitising happens in
 * `recordPageView`.
 */
export async function analyticsPageViewRoute(req: Request): Promise<Response> {
  const body = await readJson<{ path?: unknown; referrer?: unknown }>(req)
  recordPageView(req, body)
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
}

/**
 * `POST /api/analytics/event` — records privacy-safe activation and conversion
 * milestones (`landing_view`, `example_open`, `demo_start`,
 * `relation_analysis_success`, `new_paper_opened`, `star_cta_click`, etc.).
 * Rejects unknown event names with 400 and never stores search terms or tokens.
 */
export async function analyticsEventRoute(req: Request): Promise<Response> {
  const body = await readJson<{
    event?: unknown
    path?: unknown
    referrer?: unknown
    paperId?: unknown
    meta?: unknown
  }>(req)
  const ok = recordClientEvent(req, body)
  if (!ok) {
    return json({ error: { code: 'VALIDATION_FAILED', message: 'unsupported analytics event' } }, 400)
  }
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
}

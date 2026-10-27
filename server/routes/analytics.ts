import { readJson } from '../errors'
import { recordPageView } from '../analytics'

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

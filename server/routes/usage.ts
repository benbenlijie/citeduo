import { parseUsageRange, usageStats } from '../analytics'

/** `GET /api/admin/usage?range=7d|30d|90d|all` — aggregate usage JSON. */
export function usageRoute(url: URL): Response {
  const { key } = parseUsageRange(url.searchParams.get('range'))
  return new Response(JSON.stringify({ data: usageStats(key) }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

import { getDemoQuotaStatus, resetDemoQuota } from '../demo-quota'

function noStore(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

/** `GET /api/admin/demo-quota` — current budget state. */
export function demoQuotaRoute(): Response {
  return noStore({ data: getDemoQuotaStatus() })
}

/** `POST /api/admin/demo-quota/reset` — unblock the current day immediately. */
export function demoQuotaResetRoute(): Response {
  return noStore({ data: resetDemoQuota(), reset: true })
}

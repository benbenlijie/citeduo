import { apiUrl } from './apiBase'

export const GITHUB_REPO_URL = 'https://github.com/benbenlijie/citeduo'

export type ConversionEventName =
  | 'landing_view'
  | 'example_open'
  | 'demo_start'
  | 'paper_search_success'
  | 'network_view'
  | 'relation_analysis_started'
  | 'relation_analysis_success'
  | 'new_paper_opened'
  | 'star_cta_view'
  | 'star_cta_click'
  | 'github_outbound'

export type ConversionMeta = Record<string, string | number | boolean | undefined>

const seenPapers = new Set<string>()
let discoverySucceeded = false
let demoStarted = false
let networkViewed = false

export function resetConversionStateForTests(): void {
  seenPapers.clear()
  discoverySucceeded = false
  demoStarted = false
  networkViewed = false
}

export function rememberInitialPapers(ids: (string | null | undefined)[]): void {
  for (const id of ids) {
    if (id && id.trim()) seenPapers.add(id.trim())
  }
}

export function hasDiscoverySuccess(): boolean {
  return discoverySucceeded
}

export function githubStarUrl(placement: string): string {
  const url = new URL(GITHUB_REPO_URL)
  url.searchParams.set('utm_source', 'citeduo.com')
  url.searchParams.set('utm_medium', 'workspace')
  url.searchParams.set('utm_campaign', 'value_verified_star')
  url.searchParams.set('utm_content', placement)
  return url.toString()
}

export function trackConversionEvent(
  event: ConversionEventName,
  options: { paperId?: string; meta?: ConversionMeta } = {},
): void {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return
  const path = window.location.pathname
  const referrer = document.referrer || ''
  void fetch(apiUrl('/analytics/event'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event,
      path,
      referrer,
      ...(options.paperId ? { paperId: options.paperId } : {}),
      ...(options.meta ? { meta: options.meta } : {}),
    }),
    credentials: 'same-origin',
    keepalive: true,
  }).catch(() => {
    // Analytics must never interrupt user actions.
  })
}

export function recordDemoStartOnce(source?: string): void {
  if (demoStarted) return
  demoStarted = true
  trackConversionEvent('demo_start', {
    meta: source ? { source } : undefined,
  })
}

export function recordNetworkViewOnce(paperId: string | undefined): void {
  if (networkViewed) return
  networkViewed = true
  if (paperId) seenPapers.add(paperId)
  trackConversionEvent('network_view', { paperId })
}

/**
 * Marks `discovery_success` and emits `new_paper_opened` when the user opens a
 * paper from a relation path or graph inspection that was not one of the
 * initial endpoint papers.
 */
export function recordPaperOpenedFromRelation(
  paperId: string,
  endpoints: { fromId?: string | null; toId?: string | null },
  source: string,
): boolean {
  const clean = paperId.trim()
  if (!clean) return false
  const isEndpoint = clean === endpoints.fromId || clean === endpoints.toId
  const previouslySeen = seenPapers.has(clean)
  seenPapers.add(clean)
  if (isEndpoint || previouslySeen) return false
  discoverySucceeded = true
  trackConversionEvent('new_paper_opened', {
    paperId: clean,
    meta: { source, valueVerified: true },
  })
  return true
}

export function recordStarClick(placement: string): void {
  const valueVerified = discoverySucceeded
  trackConversionEvent('star_cta_click', {
    meta: { placement, valueVerified },
  })
  trackConversionEvent('github_outbound', {
    meta: { placement, valueVerified },
  })
}

import { config } from './config'
import { withRetry } from './retry'
import { createLimiter } from './rateLimit'

const limiter = createLimiter(config.s2.minIntervalMs)

/** Rate-limited Semantic Scholar fetch (1 req/s, with or without an API key). */
function s2Fetch(url: string, init?: RequestInit): Promise<Response> {
  return limiter(() => fetch(url, init))
}

// `references.citationCount` looks redundant against the top-level count, but
// connect.ts ranks references and picks its frontier by citation count ("most
// cited first", "most significant shared ancestor"). Without it every nested
// entry reads undefined and both comparators are inert.
//
// The citing side is deliberately NOT embedded here. The batch endpoint returns
// up to 1000 citations (~200 KB) per paper whatever the caller needs: for two
// papers that measured 1.8 MB / 5.9 s against 21 KB / 1.1 s without it, and
// every caller slices to 25-40 entries anyway. `getCitingPaperList` fetches a
// capped list instead.
const FIELDS =
  'paperId,title,abstract,year,citationCount,authors,venue,url,openAccessPdf,fieldsOfStudy,externalIds,' +
  'references.paperId,references.title,references.year,references.citationCount'

export interface S2Paper {
  paperId: string
  title?: string
  abstract?: string
  year?: number
  citationCount?: number
  authors?: Array<{ authorId?: string; name: string; url?: string; affiliations?: string[] }>
  venue?: string
  url?: string
  openAccessPdf?: { url?: string }
  externalIds?: { DOI?: string; ArXiv?: string; [key: string]: string | undefined }
  fieldsOfStudy?: string[]
  journal?: string
  references?: Array<{ paperId: string; title?: string; year?: number; citationCount?: number }>
  citations?: Array<{ paperId: string; title?: string; year?: number; citationCount?: number }>
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    'User-Agent': `CiteDuo/0.1.0 (+https://github.com/benbenlijie/citeduo) (mailto:${config.s2.contactEmail})`,
  }
  if (config.s2.apiKey) h['x-api-key'] = config.s2.apiKey
  return h
}

async function getJson(url: string): Promise<any> {
  const res = await s2Fetch(url, { headers: headers(), signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw Object.assign(new Error(`S2 ${res.status} ${res.statusText}`), { status: res.status })
  return res.json()
}

export function getPaper(s2Path: string): Promise<S2Paper> {
  return withRetry(() => getJson(`${config.s2.base}/paper/${encodeURIComponent(s2Path)}?fields=${FIELDS}`),
    { retries: 3, baseDelayMs: 400 })
}

const SEARCH_FIELDS =
  'paperId,title,abstract,year,citationCount,authors,venue,publicationDate,fieldsOfStudy,url,openAccessPdf,externalIds'

/** 关键词搜索。对 429/5xx 退避重试；重试耗尽后抛出（携带 status）。 */
export function searchPapers(query: string): Promise<S2Paper[]> {
  return withRetry(async () => {
    const res = await s2Fetch(
      `${config.s2.base}/paper/search?query=${encodeURIComponent(query)}&limit=20&fields=${SEARCH_FIELDS}`,
      { headers: headers(), signal: AbortSignal.timeout(15000) },
    )
    if (!res.ok) throw Object.assign(new Error(`S2 search ${res.status} ${res.statusText}`), { status: res.status })
    return ((await res.json()) as { data?: S2Paper[] }).data ?? []
  }, { retries: 3, baseDelayMs: 400 })
}

/** 一次最多 500 个 id，返回与入参同序的数组（缺失为 null）。 */
export function getPapersBatch(s2Paths: string[]): Promise<(S2Paper | null)[]> {
  return withRetry(async () => {
    const res = await s2Fetch(`${config.s2.base}/paper/batch?fields=${FIELDS}`, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: s2Paths }),
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) throw Object.assign(new Error(`S2 batch ${res.status}`), { status: res.status })
    return (await res.json()) as (S2Paper | null)[]
    // 300 ms base: the free pool answers a big share of requests with 429, and a
    // connect request that spends 8 s asleep has already lost the user. Local
    // knowledge is the fallback, so giving up early is the cheaper mistake.
  }, { retries: 3, baseDelayMs: 300 })
}

export function getRecommendations(s2Path: string): Promise<any> {
  const base = config.s2.base.replace('/graph/v1', '/recommendations/v1')
  return getJson(`${base}/papers/forpaper/${encodeURIComponent(s2Path)}?fields=paperId,title,year,citationCount,authors,venue&limit=10`)
}

const CITING_LIST_FIELDS =
  'citingPaper.paperId,citingPaper.title,citingPaper.year,citingPaper.citationCount'

/**
 * Up to `limit` works that cite this paper, shaped like the `citations` array the
 * batch endpoint used to embed (so callers did not have to change).
 *
 * Best-effort on purpose: a rate limit or an outage means "no citing side known",
 * which the local-first design already tolerates, and a retry storm here would
 * cost more than the data is worth.
 */
export async function getCitingPaperList(
  s2Path: string,
  limit: number,
): Promise<Array<{ paperId: string; title?: string; year?: number; citationCount?: number }>> {
  if (limit <= 0 || !s2Path) return []
  try {
    const res = await s2Fetch(
      `${config.s2.base}/paper/${encodeURIComponent(s2Path)}/citations?fields=${CITING_LIST_FIELDS}&limit=${limit}`,
      { headers: headers(), signal: AbortSignal.timeout(15000) },
    )
    if (!res.ok) return []
    const body = (await res.json()) as {
      data?: Array<{ citingPaper?: { paperId?: string; title?: string; year?: number; citationCount?: number } }>
    }
    return (body.data ?? [])
      .map((row) => row.citingPaper)
      .filter((p): p is { paperId: string; title?: string; year?: number; citationCount?: number } =>
        Boolean(p?.paperId),
      )
  } catch {
    return []
  }
}

export function getCitationContexts(s2Path: string): Promise<any> {
  return getJson(`${config.s2.base}/paper/${encodeURIComponent(s2Path)}/citations?fields=contexts,citingPaper.paperId,citingPaper.title,citingPaper.year,isInfluential&limit=20`)
}

const LINEAGE_FIELDS =
  'contexts,isInfluential,citedPaper.paperId,citedPaper.title,citedPaper.year,citedPaper.citationCount,citedPaper.authors,citedPaper.venue'
const CITING_FIELDS =
  'contexts,isInfluential,citingPaper.paperId,citingPaper.title,citingPaper.year,citingPaper.citationCount,citingPaper.authors,citingPaper.venue'

/** Works the paper references (its predecessors). */
export function getReferences(s2Path: string, limit: number): Promise<any> {
  return withRetry(
    () => getJson(`${config.s2.base}/paper/${encodeURIComponent(s2Path)}/references?fields=${LINEAGE_FIELDS}&limit=${limit}`),
    { retries: 2, baseDelayMs: 500 },
  )
}

/** Works that cite the paper (its successors). */
export function getCitations(s2Path: string, limit: number): Promise<any> {
  return withRetry(
    () => getJson(`${config.s2.base}/paper/${encodeURIComponent(s2Path)}/citations?fields=${CITING_FIELDS}&limit=${limit}`),
    { retries: 2, baseDelayMs: 500 },
  )
}

/** SPECTER2 embeddings for up to 500 ids (single attempt; rate limits are common). */
export async function getEmbeddingsBatch(s2Paths: string[]): Promise<Map<string, number[]>> {
  const out = new Map<string, number[]>()
  if (!s2Paths.length) return out
  const res = await s2Fetch(`${config.s2.base}/paper/batch?fields=embedding.specter_v2`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: s2Paths }),
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw Object.assign(new Error(`S2 embeddings ${res.status}`), { status: res.status })
  const data = (await res.json()) as Array<{ embedding?: { vector?: number[] } } | null>
  data.forEach((p, i) => {
    const vector = p?.embedding?.vector
    if (Array.isArray(vector) && vector.length) out.set(s2Paths[i], vector)
  })
  return out
}

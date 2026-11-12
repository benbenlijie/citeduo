/**
 * "How are these two papers connected?" — the orchestration layer.
 *
 * Strategy, cheapest first:
 *   1. Fetch both papers in ONE Semantic Scholar batch call. That payload embeds
 *      each paper's reference list, which is enough to spot direct citations,
 *      bibliographic coupling (both reference the same work) and, with the
 *      citing lists fetched separately and capped, co-citation.
 *   2. Merge in every relation already persisted locally (SQLite), which costs
 *      nothing and often already contains the answer for explored papers.
 *   3. Only if nothing was found, snowball outward from both endpoints with
 *      rate-limited batch fetches, re-running the search after each level.
 *   4. As a last resort, fall back to SPECTER2 similarity.
 *
 * The result is a renderable sub-graph (nodes + edges in the same shape the
 * network graph uses) plus a per-hop Chinese explanation.
 */

import type { Database } from 'bun:sqlite'
import { db as defaultDb } from './db'
import { ApiError } from './errors'
import { config } from './config'
import { getPapersBatch, getCitingPaperList, getEmbeddingsBatch, type S2Paper } from './s2'
import { toS2Input } from './resolve'
import { graphNodeFromS2, type GraphEdge, type GraphNode } from './graph'
import { cosineSimilarity, getEmbeddings, upsertEmbedding } from './embeddings'
import { upsertPaper, upsertCitation, ensurePaperStub, getPaper } from './papers'
import { persistRelations } from './relations'
import {
  buildAdjacency,
  classifyPath,
  describePath,
  explainHop,
  intersectIds,
  pathNodeIds,
  pathScore,
  rankedPaths,
  semanticBridgeSteps,
  semanticSteps,
  type PathEdge,
  type PathEdgeType,
  type PathKind,
  type PathStep,
} from './pathfind'

const KNOWN_TYPES = new Set<string>(['reference', 'citation', 'related', 'coupling', 'semantic'])

/** Rank popular papers first, with a stable fallback for tied citation counts. */
function byCitations<T extends { paperId: string; citationCount?: number }>(a: T, b: T): number {
  const count = (b.citationCount ?? 0) - (a.citationCount ?? 0)
  if (count !== 0) return count
  return a.paperId < b.paperId ? -1 : a.paperId > b.paperId ? 1 : 0
}

/** Every relation already known to SQLite, as traversal edges. */
export function loadLocalEdges(dbIn: Database = defaultDb): PathEdge[] {
  const out: PathEdge[] = []
  const relations = dbIn
    .query('select from_id, to_id, type, weight from paper_relations')
    .all() as { from_id: string; to_id: string; type: string; weight: number }[]
  for (const r of relations) {
    if (!KNOWN_TYPES.has(r.type)) continue
    if (!r.from_id || !r.to_id) continue
    out.push({
      from: r.from_id,
      to: r.to_id,
      type: r.type as PathEdgeType,
      weight: Number(r.weight) || 1,
    })
  }
  // `citations` holds the same citing -> cited fact but outlives relation rows,
  // so it widens local coverage considerably.
  const cites = dbIn
    .query('select citing_paper_id as f, cited_paper_id as t from citations')
    .all() as { f: string; t: string }[]
  for (const c of cites) {
    if (!c.f || !c.t) continue
    out.push({ from: c.f, to: c.t, type: 'reference', weight: 1 })
  }
  return out
}

/**
 * Order a paper's reference list so works shared with the other endpoint come
 * first (most cited first). Breadth-first search keeps adjacency insertion
 * order, so this makes the *most significant* shared ancestor the one the
 * coupling path is drawn through instead of an arbitrary one.
 */
export function orderReferences<T extends { paperId: string; citationCount?: number }>(
  refs: readonly T[],
  shared: ReadonlySet<string>,
  limit: number,
): T[] {
  const priority: T[] = []
  const rest: T[] = []
  for (const r of refs) (shared.has(r.paperId) ? priority : rest).push(r)
  priority.sort(byCitations)
  rest.sort(byCitations)
  return [...priority, ...rest].slice(0, limit)
}

/** Next batch of papers to expand: not yet seen, most cited first. */
export function pickFrontier(
  candidates: readonly { paperId: string; citationCount?: number }[],
  seen: ReadonlySet<string>,
  limit: number,
): string[] {
  const out: string[] = []
  const taken = new Set<string>()
  const ranked = [...candidates].sort(byCitations)
  for (const c of ranked) {
    if (seen.has(c.paperId) || taken.has(c.paperId)) continue
    taken.add(c.paperId)
    out.push(c.paperId)
    if (out.length >= limit) break
  }
  return out
}

export interface ConnectionHop {
  from: string
  to: string
  type: PathEdgeType
  /** true when the walk followed the stored citing -> cited direction. */
  forward: boolean
  text: string
}

export interface ConnectionPath {
  kind: PathKind
  /** Paper ids in walk order, starting at the from-paper. */
  nodeIds: string[]
  nodes: GraphNode[]
  edges: GraphEdge[]
  hops: ConnectionHop[]
  hopCount: number
  score: number
  summary: string
}

export interface ConnectionSignals {
  sharedReferences: GraphNode[]
  sharedCiters: GraphNode[]
  semanticSimilarity: number | null
  sharedFields: string[]
  sharedAuthors: string[]
}

export interface ConnectStats {
  /** Live batch fetches actually performed. */
  expanded: number
  nodes: number
  edges: number
  elapsedMs: number
  source: 'local' | 'live'
  truncated: boolean
  /** The upstream API could not be reached, so this answer is cache-only. */
  upstreamUnavailable: boolean
}

export interface ConnectionResult {
  from: GraphNode
  to: GraphNode
  found: boolean
  best: ConnectionPath | null
  alternatives: ConnectionPath[]
  signals: ConnectionSignals
  stats: ConnectStats
}

export interface ConnectOptions {
  maxExpansions?: number
  batchSize?: number
  frontierLimit?: number
  maxHops?: number
  maxPaths?: number
  maxExecutionMs?: number
  /** false = offline, only walk relations already in SQLite. */
  live?: boolean
  /** Override the SQLite handle (tests use an in-memory database). */
  db?: Database
}

type PartialPaper = Partial<S2Paper> & { paperId: string }

/**
 * Whether the endpoint fetch failed in a way that tells us nothing about the
 * paper. A 404 (or 400) is the upstream *answering* "not here" — which must stay
 * a "not found" for the user. A 401/403/429/5xx or a network error means we could
 * not ask properly, and only that is worth asking the user to retry.
 */
function isUpstreamAnswer(err: unknown): boolean {
  const status = (err as { status?: number })?.status
  return status === 404 || status === 400
}

/** How many papers per snowball expansion get their citing list fetched. */
const CITE_FETCH_PER_EXPANSION = 8

/**
 * Papers that cite `root`, read from the local edge set.
 *
 * `loadLocalEdges` turns a `citations` row (citing -> cited) into a `reference`
 * edge pointing the same way, and a stored `citation` relation already points
 * citer -> cited, so "cites root" is simply "ends at root" in both shapes.
 */
function localCiters(root: string, edges: readonly PathEdge[]): PartialPaper[] {
  const seen = new Set<string>()
  const out: PartialPaper[] = []
  for (const e of edges) {
    if (e.to !== root || e.from === root || seen.has(e.from)) continue
    seen.add(e.from)
    out.push({ paperId: e.from })
  }
  return out
}

/**
 * Phase timings, off unless CONNECT_TRACE=1. Interactive latency here is a
 * product feature, so the numbers have to be easy to pull out of a running
 * server instead of guessed at.
 */
const TRACE = process.env.CONNECT_TRACE === '1'
const trace = (label: string, t0: number): void => {
  if (TRACE) console.log(`[connect] ${label}: ${Date.now() - t0}ms`)
}

export async function findConnection(
  fromId: string,
  toId: string,
  opts: ConnectOptions = {},
): Promise<ConnectionResult> {
  const cfg = config.connect
  const maxExpansions = opts.maxExpansions ?? cfg.maxExpansions
  const batchSize = opts.batchSize ?? cfg.batchSize
  const frontierLimit = opts.frontierLimit ?? cfg.frontierLimit
  const maxHops = opts.maxHops ?? cfg.maxHops
  const maxPaths = opts.maxPaths ?? cfg.maxPaths
  const maxExecutionMs = opts.maxExecutionMs ?? cfg.maxExecutionMs
  // `CONNECT_LOCAL_ONLY` is an operator policy, not a default: a client that
  // asks for `live` still gets a local-only search when it is set.
  const live = cfg.localOnly ? false : (opts.live ?? true)
  const semanticMinSim = cfg.semanticMinSim
  const dbIn = opts.db ?? defaultDb
  const started = Date.now()

  const tResolve = Date.now()
  const [fromPath, toPath] = await Promise.all([toS2Input(fromId), toS2Input(toId)])
  trace('resolve', tResolve)

  // Fetching the endpoints is best-effort: local-first means a rate limit or an
  // outage degrades to cached knowledge instead of failing the whole request.
  let upstreamUnavailable = false
  let fetched: (S2Paper | null)[] = [null, null]
  const tEndpoints = Date.now()
  try {
    fetched = await getPapersBatch([fromPath, toPath])
  } catch (e) {
    upstreamUnavailable = !isUpstreamAnswer(e)
  }
  trace('endpoint fetch', tEndpoints)
  const fromPaper = fetched[0] ?? getPaper(fromPath, dbIn) ?? getPaper(fromId, dbIn)
  const toPaper = fetched[1] ?? getPaper(toPath, dbIn) ?? getPaper(toId, dbIn)
  // A rate-limited upstream with nothing cached is not "no such paper": saying so
  // sends the user hunting for a typo that is not there.
  const missing = (side: string): ApiError =>
    upstreamUnavailable && live
      ? new ApiError(
          'UPSTREAM_FAILED',
          `上游 Semantic Scholar 暂时限流或超时，本地也没有${side}的缓存，请稍后重试`,
          503,
        )
      : new ApiError('PAPER_NOT_FOUND', `找不到${side}`, 404)
  if (!fromPaper?.paperId) throw missing('起点论文')
  if (!toPaper?.paperId) throw missing('终点论文')

  const rootFrom = fromPaper.paperId
  const rootTo = toPaper.paperId

  const nodes = new Map<string, GraphNode>()
  const titles = new Map<string, string>()
  const edgeKeys = new Set<string>()
  const edges: PathEdge[] = []
  const expanded = new Set<string>([rootFrom, rootTo])

  const remember = (p: PartialPaper, depth = 1) => {
    if (!p?.paperId || nodes.has(p.paperId)) return
    nodes.set(p.paperId, graphNodeFromS2(p, false, depth))
    titles.set(p.paperId, p.title || p.paperId)
  }
  const addEdge = (e: PathEdge) => {
    if (!e.from || !e.to || e.from === e.to) return
    const key = `${e.from}|${e.to}|${e.type}`
    if (edgeKeys.has(key)) return
    edgeKeys.add(key)
    edges.push(e)
  }

  remember(fromPaper, 0)
  remember(toPaper, 0)
  nodes.set(rootFrom, graphNodeFromS2(fromPaper, true, 0))
  nodes.set(rootTo, graphNodeFromS2(toPaper, true, 0))
  titles.set(rootFrom, fromPaper.title || rootFrom)
  titles.set(rootTo, toPaper.title || rootTo)

  // ── 1. Local knowledge is free, so always start there. ────────────────────
  const tLocal = Date.now()
  for (const e of loadLocalEdges(dbIn)) addEdge(e)
  trace('local edges', tLocal)

  // Shared works are computed before absorption so the reference ordering can
  // favour them.
  const fromRefs = (fromPaper.references ?? []) as { paperId: string; citationCount?: number }[]
  const toRefs = (toPaper.references ?? []) as { paperId: string; citationCount?: number }[]
  // The citing side is a capped request of its own now, so a paper with 100k
  // citations does not drag 1000 rows through every batch. Offline it is read
  // from the local edges instead, which is what local-first means here.
  const tCites = Date.now()
  const [fromCites, toCites] = live
    ? await Promise.all([getCitingPaperList(rootFrom, cfg.citeLimit), getCitingPaperList(rootTo, cfg.citeLimit)])
    : [localCiters(rootFrom, edges), localCiters(rootTo, edges)]
  // `absorb` reads `p.citations`; keep that one code path working.
  fromPaper.citations = fromCites
  toPaper.citations = toCites
  trace('citing lists', tCites)
  const sharedRefIds = intersectIds(
    orderReferences(fromRefs, new Set(toRefs.map((r) => r.paperId)), fromRefs.length).map((r) => r.paperId),
    new Set(toRefs.map((r) => r.paperId)),
  )
  const sharedCiteIds = intersectIds(
    fromCites.map((c) => c.paperId),
    new Set(toCites.map((c) => c.paperId)),
  )

  const absorb = (p: S2Paper, depth: number, shared: ReadonlySet<string>): PartialPaper[] => {
    const discovered: PartialPaper[] = []
    const refs = orderReferences(
      (p.references ?? []) as PartialPaper[],
      shared,
      cfg.refLimit,
    )
    for (const r of refs) {
      addEdge({ from: p.paperId, to: r.paperId, type: 'reference', weight: 1 })
      remember(r, depth)
      discovered.push(r)
    }
    for (const c of ((p.citations ?? []) as PartialPaper[]).slice(0, cfg.citeLimit)) {
      addEdge({ from: c.paperId, to: p.paperId, type: 'citation', weight: 1 })
      remember(c, depth)
      discovered.push(c)
    }
    return discovered
  }

  const toRefSet = new Set(toRefs.map((r) => r.paperId))
  const fromRefSet = new Set(fromRefs.map((r) => r.paperId))
  let frontier = [
    ...absorb(fromPaper, 1, toRefSet),
    ...absorb(toPaper, 1, fromRefSet),
  ]

  // ── 2. Search what we already have. ───────────────────────────────────────
  // A local `coupling` row is a denormalised summary of two reference rows, so
  // traversing it lets a one-hop shortcut hide the very work the user asked to
  // see ("through which papers are these two connected?"). Search the real
  // relations first and only fall back to the summary edges when the
  // underlying rows are not cached.
  const search = () => {
    const strict = rankedPaths(rootFrom, rootTo, buildAdjacency(edges.filter((e) => e.type !== 'coupling')), {
      limit: maxPaths,
      maxHops,
    })
    if (strict.length) return strict
    return rankedPaths(rootFrom, rootTo, buildAdjacency(edges), { limit: maxPaths, maxHops })
  }

  let paths = search()
  let liveUsed = false

  // ── 3. Snowball outward from both endpoints until the budget runs out. ────
  if (!paths.length && live && rootFrom !== rootTo) {
    const discovered = new Set<string>(expanded)
    let batches = 0
    while (batches < maxExpansions && Date.now() - started < maxExecutionMs) {
      const batch = pickFrontier(frontier, discovered, Math.min(batchSize, frontierLimit))
      if (!batch.length) break
      batch.forEach((id) => discovered.add(id))
      let fetchedBatch: (S2Paper | null)[]
      try {
        fetchedBatch = await getPapersBatch(batch)
      } catch {
        // Upstream is best-effort: whatever we already collected still stands.
        break
      }
      batches++
      liveUsed = true
      const next: PartialPaper[] = []
      // Citing lists are one capped request per paper now, so only the front of
      // the batch is worth it: those are the papers whose successors shape the
      // graph. The rest contribute their references, which came along for free.
      // The snowball runs while a user waits, and each of these calls costs the
      // upstream spacing interval on the wire (1 s without a key), so this cap is
      // deliberately smaller than the crawl's.
      const citingLists = new Map<string, PartialPaper[]>()
      await Promise.all(
        fetchedBatch.slice(0, CITE_FETCH_PER_EXPANSION).map(async (p) => {
          if (p?.paperId) citingLists.set(p.paperId, await getCitingPaperList(p.paperId, cfg.citeLimit))
        }),
      )
      for (const p of fetchedBatch) {
        if (!p?.paperId) continue
        p.citations = citingLists.get(p.paperId) ?? []
        remember(p, 2)
        try {
          upsertPaper(p, dbIn)
        } catch {
          // persistence is best-effort
        }
        next.push(...absorb(p, 2, new Set()))
      }
      paths = search()
      if (paths.length) break
      frontier = next.slice(0, frontierLimit)
    }
  }

  // ── 4. Similarity fallback when no structural route exists. ───────────────
  const tVectors = Date.now()
  const vectors = await loadVectors([rootFrom, rootTo], dbIn)
  trace('embeddings', tVectors)
  const vecFrom = vectors.get(rootFrom)
  const vecTo = vectors.get(rootTo)
  let semanticSimilarity: number | null = null
  if (vecFrom && vecTo) semanticSimilarity = cosineSimilarity(vecFrom, vecTo)

  let semanticPath: PathStep[] | null = null
  if (!paths.length && rootFrom !== rootTo && vecFrom && vecTo) {
    semanticPath = findSemanticBridge(rootFrom, rootTo, vecFrom, vecTo, nodes, semanticMinSim, dbIn)
    if (!semanticPath && semanticSimilarity !== null && semanticSimilarity >= semanticMinSim) {
      semanticPath = semanticSteps(rootFrom, rootTo, Number(semanticSimilarity.toFixed(3)))
    }
  }

  // ── Assemble. ─────────────────────────────────────────────────────────────
  const materialize = (steps: PathStep[]): ConnectionPath => {
    const nodeIds = pathNodeIds(rootFrom, steps)
    const pathNodes = nodeIds.map(
      (id) => nodes.get(id) ?? graphNodeFromS2({ paperId: id, title: id }, false, 1),
    )
    const pathEdges: GraphEdge[] = []
    const seen = new Set<string>()
    for (const s of steps) {
      const key = `${s.from}|${s.to}|${s.type}`
      if (seen.has(key)) continue
      seen.add(key)
      pathEdges.push({ from: s.from, to: s.to, type: s.type, weight: s.weight })
    }
    return {
      kind: classifyPath(steps),
      nodeIds,
      nodes: pathNodes,
      edges: pathEdges,
      hops: steps.map((s) => ({
        from: s.from,
        to: s.to,
        type: s.type,
        forward: s.forward,
        text: explainHop(s, titles),
      })),
      hopCount: steps.length,
      score: pathScore(steps),
      summary: describePath(rootFrom, rootTo, steps, titles),
    }
  }

  // Pasting the same id twice is a degenerate but real input.
  const structural = rootFrom === rootTo ? [materialize([])] : paths.map(materialize)
  const best = structural[0] ?? (semanticPath ? materialize(semanticPath) : null)
  const alternatives = structural.slice(1)

  // Persist what we learned so the next query is cheaper (best-effort).
  persistLearned(edges, nodes, dbIn)

  const signals: ConnectionSignals = {
    sharedReferences: sharedRefIds.map((id) => nodeOf(id, nodes)),
    sharedCiters: sharedCiteIds.map((id) => nodeOf(id, nodes)),
    semanticSimilarity: semanticSimilarity === null ? null : Number(semanticSimilarity.toFixed(3)),
    sharedFields: intersect(
      fromPaper.fieldsOfStudy ?? [],
      new Set(toPaper.fieldsOfStudy ?? []),
    ),
    sharedAuthors: intersect(
      (fromPaper.authors ?? []).map((a) => a.name),
      new Set((toPaper.authors ?? []).map((a) => a.name)),
    ),
  }

  return {
    from: nodes.get(rootFrom)!,
    to: nodes.get(rootTo)!,
    found: Boolean(best),
    best,
    alternatives,
    signals,
    stats: {
      expanded: expanded.size,
      nodes: nodes.size,
      edges: edges.length,
      elapsedMs: Date.now() - started,
      source: liveUsed ? 'live' : 'local',
      truncated: liveUsed && !paths.length && Date.now() - started >= maxExecutionMs,
      upstreamUnavailable,
    },
  }
}

function intersect(a: readonly string[], b: ReadonlySet<string>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const x of a) {
    if (!b.has(x) || seen.has(x)) continue
    seen.add(x)
    out.push(x)
    if (out.length >= 8) break
  }
  return out
}

/** A node for `id`, preferring a registered one and falling back to a stub. */
function nodeOf(id: string, nodes: Map<string, GraphNode>): GraphNode {
  return nodes.get(id) ?? graphNodeFromS2({ paperId: id, title: id }, false, 1)
}

/** Cached SPECTER2 vectors, fetching only what is missing (single attempt). */
async function loadVectors(ids: string[], dbIn: Database): Promise<Map<string, number[]>> {
  const vectors = getEmbeddings(ids, dbIn)
  const missing = ids.filter((id) => !vectors.has(id))
  if (!missing.length) return vectors
  try {
    const fetched = await getEmbeddingsBatch(missing)
    for (const [id, vector] of fetched) {
      vectors.set(id, vector)
      try {
        upsertEmbedding(id, 'specter_v2', vector, dbIn)
      } catch {
        // cache write is best-effort
      }
    }
  } catch {
    // similarity is optional
  }
  return vectors
}

/**
 * The work that is similar to both endpoints, i.e. the best `Z` maximising
 * min(sim(A,Z), sim(Z,B)). Only ids we already hold vectors for are considered.
 */
function findSemanticBridge(
  from: string,
  to: string,
  vecFrom: number[],
  vecTo: number[],
  nodes: Map<string, GraphNode>,
  minSim: number,
  dbIn: Database,
): PathStep[] | null {
  const candidates = [...nodes.keys()].filter((id) => id !== from && id !== to).slice(0, 200)
  if (!candidates.length) return null
  const vectors = getEmbeddings(candidates, dbIn)
  let best: { id: string; simFrom: number; simTo: number; floor: number } | null = null
  for (const [id, vector] of vectors) {
    const simFrom = cosineSimilarity(vecFrom, vector)
    const simTo = cosineSimilarity(vector, vecTo)
    const floor = Math.min(simFrom, simTo)
    if (floor < minSim) continue
    if (!best || floor > best.floor) best = { id, simFrom, simTo, floor }
  }
  if (!best) return null
  return semanticBridgeSteps(
    from,
    best.id,
    to,
    Number(best.simFrom.toFixed(3)),
    Number(best.simTo.toFixed(3)),
  )
}

/** Best-effort write-back so a connection search enriches the local graph. */
function persistLearned(edges: PathEdge[], nodes: Map<string, GraphNode>, dbIn: Database): void {
  try {
    // One transaction. Doing this statement by statement meant ~4500 auto-commits
    // for a 3100-edge graph, and the fsyncs alone cost about 6 of the 8 seconds a
    // connect request used to take.
    dbIn.transaction(() => {
      for (const node of nodes.values()) {
        ensurePaperStub(node.id, dbIn)
      }
      for (const e of edges) {
        if (e.type === 'reference') upsertCitation(e.from, e.to, dbIn)
      }
      persistRelations(
        edges.map((e) => ({ from: e.from, to: e.to, type: e.type, weight: e.weight })),
        dbIn,
      )
    })()
  } catch {
    // never let persistence break the response
  }
}

import { getPapersBatch, getRecommendations, getCitingPaperList, getEmbeddingsBatch, type S2Paper } from './s2'
import { getRelatedWorksForPaper } from './openalex'
import { canonicalKeyFromS2, mergeDuplicates, normalizeDoi } from './identity'
import { getEmbeddings, semanticNeighborEdges, upsertEmbedding } from './embeddings'
import { louvain } from './community'
import { config } from './config'
import { upsertPaper, upsertCitation, ensurePaperStub } from './papers'
import { db } from './db'
import { persistRelations } from './relations'

export interface GraphNode {
  id: string; label: string; title: string; abstract?: string; year?: number
  citationCount: number; authors: string; venue?: string; url?: string; pdfUrl?: string
  fieldsOfStudy: string[]; isRoot: boolean; depth: number
  pageRankScore: number; clusterId: number; size: number; color: string
}
export interface GraphEdge { from: string; to: string; type: 'reference' | 'citation' | 'related' | 'coupling' | 'semantic'; weight: number }
export interface Graph { nodes: GraphNode[]; edges: GraphEdge[] }

export function connectedComponents(nodes: GraphNode[], edges: GraphEdge[]): Map<string, number> {
  const adj = new Map<string, string[]>()
  for (const n of nodes) adj.set(n.id, [])
  for (const e of edges) {
    adj.get(e.from)?.push(e.to)
    adj.get(e.to)?.push(e.from)
  }
  const comp = new Map<string, number>()
  let id = 0
  for (const n of nodes) {
    if (comp.has(n.id)) continue
    const stack = [n.id]
    while (stack.length) {
      const cur = stack.pop()!
      if (comp.has(cur)) continue
      comp.set(cur, id)
      for (const nb of adj.get(cur) ?? []) if (!comp.has(nb)) stack.push(nb)
    }
    id++
  }
  return comp
}

/** Compress multi-count edge weights onto a citation-comparable scale for PageRank / Louvain. */
export function edgeAnalysisWeight(e: Pick<GraphEdge, 'type' | 'weight'>): number {
  const raw = e.weight > 0 ? e.weight : 1
  if (e.type === 'coupling' || e.type === 'related') return 1 + Math.log10(raw)
  return raw
}

export function pagerank(nodes: GraphNode[], edges: GraphEdge[], damping = 0.85, iterations = 20): Map<string, number> {
  const n = nodes.length
  const pr = new Map<string, number>()
  const out = new Map<string, { to: string; w: number }[]>()
  for (const node of nodes) { pr.set(node.id, 1 / n); out.set(node.id, []) }
  for (const e of edges) {
    const w = edgeAnalysisWeight(e)
    out.get(e.from)?.push({ to: e.to, w })
    // Bibliographic coupling is symmetric: let rank flow both ways.
    if (e.type === 'coupling') out.get(e.to)?.push({ to: e.from, w })
  }

  for (let i = 0; i < iterations; i++) {
    const next = new Map<string, number>()
    for (const node of nodes) next.set(node.id, (1 - damping) / n)
    let lost = 0
    for (const node of nodes) {
      const links = out.get(node.id)!
      const total = links.reduce((s, l) => s + l.w, 0)
      const current = pr.get(node.id) ?? 0
      if (!links.length || total <= 0) { lost += damping * current; continue }
      const base = damping * current
      for (const link of links) {
        const share = base * (link.w / total)
        if (next.has(link.to)) next.set(link.to, next.get(link.to)! + share)
        else lost += share
      }
    }
    // Redistribute dangling / out-of-set mass uniformly so the vector sums to 1.
    const share = lost / n
    if (share) for (const node of nodes) next.set(node.id, next.get(node.id)! + share)
    for (const [k, v] of next) pr.set(k, v)
  }
  return pr
}

const DEPTH_COLORS = ['#ff6b35', '#059669', '#7c3aed', '#dc2626', '#6b7280']
const colorFor = (d: number) => DEPTH_COLORS[Math.min(d, DEPTH_COLORS.length - 1)]

/**
 * Build a render-ready graph node. Accepts partial S2 payloads so reference /
 * citation list entries (which only carry paperId, title, year, citationCount)
 * can become nodes too.
 */
export function graphNodeFromS2(
  p: Partial<S2Paper> & { paperId: string },
  isRoot: boolean,
  depth: number,
): GraphNode {
  return {
    id: p.paperId, label: p.title ?? '未知标题', title: p.title ?? '', abstract: p.abstract,
    year: p.year, citationCount: p.citationCount ?? 0,
    authors: (p.authors ?? []).map((a) => a.name).join(', '),
    venue: p.venue, url: p.url, pdfUrl: p.openAccessPdf?.url,
    fieldsOfStudy: p.fieldsOfStudy ?? [], isRoot, depth,
    pageRankScore: 0, clusterId: 0,
    size: Math.max(15, Math.log10((p.citationCount ?? 0) + 1) * 12), color: colorFor(depth),
  }
}

export interface BuildOpts {
  depth: number
  maxNodes: number
  onProgress?: (done: number, total: number) => void
}

export interface CouplingOptions {
  /** Minimum Salton cosine shared / sqrt(|A| * |B|) so long reference lists do not couple everything. */
  minCosine?: number
  /** Keep at most the strongest K coupling neighbours per paper (0 = unlimited). */
  maxNeighbors?: number
}

/**
 * Undirected bibliographic coupling: papers sharing >= minShared references,
 * normalised by reference-list length and pruned to each paper's top-K matches
 * so dense sub-fields do not degenerate into an all-pairs hairball.
 */
export function bibliographicCoupling(
  refsByNode: Map<string, Set<string>>,
  minShared: number,
  opts: CouplingOptions = {},
): GraphEdge[] {
  if (minShared <= 0) return []
  const minCosine = opts.minCosine ?? 0
  const maxNeighbors = opts.maxNeighbors ?? 0
  const ids = [...refsByNode.keys()]

  interface Pair {
    from: string
    to: string
    shared: number
    cosine: number
  }

  const pairs: Pair[] = []
  for (let i = 0; i < ids.length; i++) {
    const a = refsByNode.get(ids[i])!
    if (a.size < minShared) continue
    for (let j = i + 1; j < ids.length; j++) {
      const b = refsByNode.get(ids[j])!
      if (b.size < minShared) continue
      const [small, big] = a.size <= b.size ? [a, b] : [b, a]
      let shared = 0
      for (const r of small) if (big.has(r)) shared++
      if (shared < minShared) continue
      const cosine = shared / Math.sqrt(a.size * b.size)
      if (cosine < minCosine) continue
      pairs.push({ from: ids[i], to: ids[j], shared, cosine })
    }
  }

  if (maxNeighbors <= 0) {
    return pairs.map((p) => ({ from: p.from, to: p.to, type: 'coupling', weight: p.shared }))
  }

  const byNode = new Map<string, Pair[]>()
  for (const p of pairs) {
    let left = byNode.get(p.from)
    if (!left) {
      left = []
      byNode.set(p.from, left)
    }
    left.push(p)
    let right = byNode.get(p.to)
    if (!right) {
      right = []
      byNode.set(p.to, right)
    }
    right.push(p)
  }

  const kept = new Set<Pair>()
  for (const list of byNode.values()) {
    list.sort((x, y) => y.cosine - x.cosine || y.shared - x.shared)
    for (let i = 0; i < Math.min(maxNeighbors, list.length); i++) kept.add(list[i])
  }

  return pairs
    .filter((p) => kept.has(p))
    .map((p) => ({ from: p.from, to: p.to, type: 'coupling', weight: p.shared }))
}

export interface CandidateStats {
  links: number
  citationCount?: number
  year?: number
}

/** Relevance heuristic for a candidate neighbour (higher = more relevant). */
export function scoreCandidate(input: CandidateStats, rootYear?: number): number {
  const links = input.links * 3
  const cites = Math.log10((input.citationCount ?? 0) + 1)
  const yearBonus =
    input.year && rootYear ? Math.max(0, 1 - Math.abs(input.year - rootYear) / 20) : 0
  return links + cites + yearBonus
}

/** Order candidate ids: recommended-for-root first, then by relevance score. */
export function rankCandidates(
  stats: Map<string, CandidateStats>,
  priorityIds: Set<string>,
  rootYear?: number,
): string[] {
  return [...stats.entries()]
    .sort((a, b) => {
      const pa = priorityIds.has(a[0]) ? 1 : 0
      const pb = priorityIds.has(b[0]) ? 1 : 0
      if (pa !== pb) return pb - pa
      return scoreCandidate(b[1], rootYear) - scoreCandidate(a[1], rootYear)
    })
    .map(([id]) => id)
}

function openAlexNode(w: any, depth: number): GraphNode {
  const authors = (w?.authorships ?? [])
    .map((a: any) => a?.author?.display_name)
    .filter((n: unknown): n is string => Boolean(n))
    .join(', ')
  return {
    id: normalizeDoi(w?.doi) ?? String(w?.id ?? ''),
    label: w?.title ?? '未知标题',
    title: w?.title ?? '',
    year: w?.publication_year,
    citationCount: w?.cited_by_count ?? 0,
    authors,
    venue: w?.primary_location?.source?.display_name,
    url: w?.id,
    pdfUrl: w?.open_access?.oa_url,
    fieldsOfStudy: (w?.concepts ?? []).map((c: any) => c?.display_name).filter(Boolean),
    isRoot: false,
    depth,
    pageRankScore: 0,
    clusterId: 0,
    size: Math.max(15, Math.log10((w?.cited_by_count ?? 0) + 1) * 12),
    color: colorFor(depth),
  }
}

export async function buildNetwork(root: S2Paper, opts: BuildOpts): Promise<Graph> {
  const { depth, maxNodes, onProgress } = opts
  const nodes = new Map<string, GraphNode>()
  const edges: GraphEdge[] = []
  const seen = new Set<string>([root.paperId])
  const canonicalOf = new Map<string, string>([[root.paperId, canonicalKeyFromS2(root)]])
  const refsByNode = new Map<string, Set<string>>()
  nodes.set(root.paperId, graphNodeFromS2(root, true, 0))
  upsertPaper(root)

  let frontier = [root]
  let level = 0
  const started = Date.now()
  const recommendedIds = await safeRecommendationIds(root.paperId)
  const priorityIds = new Set(recommendedIds)

  while (frontier.length && nodes.size < maxNodes && level < depth) {
    if (Date.now() - started > config.crawl.maxExecutionMs) break
    const stats = new Map<string, CandidateStats>()
    const note = (id: string, year?: number, citationCount?: number) => {
      if (seen.has(id)) return
      const s = stats.get(id) ?? { links: 0 }
      s.links += 1
      if (year != null && s.year == null) s.year = year
      if (citationCount != null) s.citationCount = Math.max(s.citationCount ?? 0, citationCount)
      stats.set(id, s)
    }
    const refLimit = config.crawl.refLimit[Math.min(level, 3)]
    const citeLimit = config.crawl.citeLimit[Math.min(level, 3)]

    // The citing side costs one capped request per paper now (see
    // getCitingPaperList), so only the front of the frontier is worth asking
    // about: those are the papers whose successors actually shape the graph.
    const citingLists = new Map<string, Array<{ paperId: string; title?: string; year?: number; citationCount?: number }>>()
    if (citeLimit > 0) {
      // S2 rate-limits the citations endpoint hard when asked in parallel; four
      // at a time keeps the root's own citing list from being the one that 429s.
      const citeFrontier = frontier.slice(0, config.crawl.citeFetchLimit)
      for (let i = 0; i < citeFrontier.length; i += 4) {
        await Promise.all(
          citeFrontier.slice(i, i + 4).map(async (p) => {
            if (p?.paperId) citingLists.set(p.paperId, await getCitingPaperList(p.paperId, citeLimit))
          }),
        )
      }
    }

    // The writes are collected and applied in one transaction per level. The
    // batch fetch below is the only await inside a level, and db.transaction()
    // is synchronous, so this is the point where the statements can be batched:
    // one auto-commit per citation was ~thousands of fsyncs per crawl.
    const pendingCites: Array<[citing: string, cited: string]> = []
    for (const paper of frontier) {
      const refs = refsByNode.get(paper.paperId) ?? new Set<string>()
      for (const r of paper.references ?? []) refs.add(r.paperId)
      refsByNode.set(paper.paperId, refs)

      for (const r of (paper.references ?? []).slice(0, refLimit)) {
        if (!edges.some((e) => e.from === paper.paperId && e.to === r.paperId)) {
          edges.push({ from: paper.paperId, to: r.paperId, type: 'reference', weight: 1 })
          pendingCites.push([paper.paperId, r.paperId])
        }
        note(r.paperId, r.year, r.citationCount)
      }
      if (citeLimit > 0) {
        for (const c of citingLists.get(paper.paperId) ?? []) {
          if (!edges.some((e) => e.from === c.paperId && e.to === paper.paperId)) {
            edges.push({ from: c.paperId, to: paper.paperId, type: 'citation', weight: 1 })
            pendingCites.push([c.paperId, paper.paperId])
          }
          note(c.paperId, c.year)
        }
      }
    }

    const writeLevel = (fetchedPapers: S2Paper[]): void => {
      for (const [citing, cited] of pendingCites) {
        // Either end can be a stub: a reference edge's cited paper, or a
        // citation edge's citing paper (fetched only as a list entry).
        ensurePaperStub(citing)
        ensurePaperStub(cited)
        upsertCitation(citing, cited)
      }
      for (const p of fetchedPapers) upsertPaper(p)
    }

    const wanted = rankCandidates(stats, priorityIds, root.year).slice(0, config.crawl.s2BatchSize)
    if (!wanted.length) {
      // No new papers, but the citations found at this level still count.
      if (pendingCites.length) db.transaction(() => writeLevel([]))()
      break
    }

    const fetched = await getPapersBatch(wanted)
    const nextFrontier: S2Paper[] = []
    for (const p of fetched) {
      if (!p || nodes.size >= maxNodes) continue
      seen.add(p.paperId)
      nodes.set(p.paperId, graphNodeFromS2(p, false, level + 1))
      canonicalOf.set(p.paperId, canonicalKeyFromS2(p))
      nextFrontier.push(p)
    }
    db.transaction(() => writeLevel(nextFrontier))()
    onProgress?.(nodes.size, maxNodes)
    frontier = nextFrontier
    level++
    if (frontier.length && Date.now() - started < config.crawl.maxExecutionMs) {
      await new Promise((r) => setTimeout(r, config.crawl.perBatchDelayMs))
    }
  }

  await addRelatedNodes(root, nodes, edges, seen, canonicalOf, maxNodes, recommendedIds)

  if (config.related.couplingMin > 0) {
    edges.push(
      ...bibliographicCoupling(refsByNode, config.related.couplingMin, {
        minCosine: config.related.couplingMinCosine,
        maxNeighbors: config.related.couplingMaxNeighbors,
      }),
    )
  }

  const merged = mergeDuplicates([...nodes.values()], edges, canonicalOf)
  const nodeList = merged.nodes
  // Edges are pushed before a node is fetched, and `maxNodes` can drop the node
  // afterwards. Keeping those edges inflates the API's edge count and makes the
  // client filter set disagree with the graph it actually paints.
  const nodeIds = new Set(nodeList.map((n) => n.id))
  const edgeList = merged.edges.filter((e) => nodeIds.has(e.from) && nodeIds.has(e.to))

  try {
    edgeList.push(...(await addSemanticEdges(nodeList)))
  } catch {
    // semantic edges are best-effort
  }

  try {
    persistRelations(edgeList)
  } catch {
    // persistence is best-effort
  }

  const pr = pagerank(nodeList, edgeList)
  const communities = louvain(
    nodeList.map((n) => n.id),
    edgeList.map((e) => ({ from: e.from, to: e.to, weight: edgeAnalysisWeight(e) })),
  )
  for (const node of nodeList) {
    node.pageRankScore = pr.get(node.id) ?? 0
    node.clusterId = communities.get(node.id) ?? 0
    node.size = Math.max(15, node.pageRankScore * 1000)
  }
  return { nodes: nodeList, edges: edgeList }
}

/** Add `related` neighbours from S2 recommendations and OpenAlex (best-effort). */
/** Best-effort SPECTER2 kNN edges over cached/short-batch vectors. */
async function addSemanticEdges(nodeList: GraphNode[]): Promise<GraphEdge[]> {
  if (config.related.embeddingK <= 0) return []
  const ids = nodeList.map((n) => n.id)
  const cached = getEmbeddings(ids)
  const missing = ids.filter((id) => !cached.has(id)).slice(0, config.related.embeddingBatch)
  if (missing.length) {
    try {
      const fetched = await getEmbeddingsBatch(missing)
      for (const [id, vector] of fetched) {
        upsertEmbedding(id, 'specter_v2', vector)
        cached.set(id, vector)
      }
    } catch {
      // S2 rate-limits embeddings (429) independently of graph data; keep the
      // edges we can build from the vectors already in the cache.
    }
  }
  const vectors = new Map<string, number[]>()
  for (const id of ids) {
    const vector = cached.get(id)
    if (vector) vectors.set(id, vector)
  }
  if (vectors.size < 2) return []
  const edges = semanticNeighborEdges(vectors, {
    k: config.related.embeddingK,
    minSim: config.related.embeddingMinSim,
  })
  return edges.map((e) => ({
    from: e.from,
    to: e.to,
    type: 'semantic' as const,
    weight: Number(e.sim.toFixed(3)),
  }))
}

async function safeRecommendationIds(s2Path: string): Promise<string[]> {  try {
    const rec = await getRecommendations(s2Path)
    return (rec?.recommendedPapers ?? [])
      .map((r: { paperId?: string }) => r?.paperId)
      .filter((id: unknown): id is string => Boolean(id))
  } catch {
    return []
  }
}

async function addRelatedNodes(
  root: S2Paper,
  nodes: Map<string, GraphNode>,
  edges: GraphEdge[],
  seen: Set<string>,
  canonicalOf: Map<string, string>,
  maxNodes: number,
  recommendedIds: string[],
): Promise<void> {
  const relatedIds: string[] = []
  for (const id of recommendedIds) {
    if (!seen.has(id)) relatedIds.push(id)
    if (relatedIds.length >= config.related.recommendLimit) break
  }

  const s2Budget = Math.max(0, Math.min(config.related.relatedNodeBudget, maxNodes - nodes.size))
  if (relatedIds.length && s2Budget > 0) {
    try {
      const fetched = await getPapersBatch(relatedIds.slice(0, s2Budget))
      fetched.forEach((p, i) => {
        if (!p || seen.has(p.paperId) || nodes.size >= maxNodes) return
        seen.add(p.paperId)
        nodes.set(p.paperId, graphNodeFromS2(p, false, 1))
        canonicalOf.set(p.paperId, canonicalKeyFromS2(p))
        upsertPaper(p)
        edges.push({ from: root.paperId, to: p.paperId, type: 'related', weight: Math.max(1, config.related.recommendLimit - i) })
      })
    } catch {
      // best-effort
    }
  }

  try {
    const doi = normalizeDoi(root.externalIds?.DOI)
    const budget = Math.max(0, Math.min(config.related.relatedNodeBudget, maxNodes - nodes.size))
    if (budget > 0 && (doi || root.title)) {
      const works = await getRelatedWorksForPaper({ doi, title: root.title, limit: config.related.openalexLimit })
      works.slice(0, budget).forEach((w, i) => {
        const id = normalizeDoi(w?.doi) ?? String(w?.id ?? '')
        if (!id || nodes.has(id)) return
        canonicalOf.set(id, id)
        nodes.set(id, openAlexNode(w, 1))
        edges.push({ from: root.paperId, to: id, type: 'related', weight: Math.max(1, config.related.openalexLimit - i) })
      })
    }
  } catch {
    // best-effort
  }
}

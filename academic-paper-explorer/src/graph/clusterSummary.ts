import type { NetworkNode } from '../types/domain'
import { clusterColor } from './encoding'

export interface ClusterTopPaper {
  id: string
  title: string
  citationCount: number
  year?: number
}

/**
 * A community rendered as something a reader can act on: a topical label
 * derived from its members, how many papers it holds, its year span and the
 * papers that best represent it.
 *
 * The label is c-TF-IDF over titles: terms frequent inside one community but
 * rare across the others. That is what turns "簇 3" into "video understanding".
 */
export interface ClusterSummary {
  id: number
  label: string
  keywords: string[]
  size: number
  share: number
  color: string
  yearRange: [number, number] | null
  topField: string | null
  topPapers: ClusterTopPaper[]
}

/**
 * Title words that say nothing about the topic. Domain words are deliberately
 * absent: "learning" or "model" win an ML graph's label because they are rare
 * across its *other* communities, which is exactly the signal we want.
 */
const STOPWORDS = new Set(
  `a an the of and for with via using used based towards toward from into on in to by at as is are was
  were be been being we our this that these those its it their they can could may might will would
  should not no than then there here also such more most less very much many few both each other
  others between among within without over under about across after before during through per vs
  versus et al new novel approach approaches method methods framework frameworks system systems
  study studies analysis analyses paper papers result results work works present presents propose
  proposed introduce introduces show shows state art survey review case application applications
  efficient effective robust general unified simple fast scalable`
    .split(/\s+/)
    .filter(Boolean),
)

/** Field labels that carry no discriminative information. */
const GENERIC_FIELDS = new Set(['computer science', 'engineering', 'mathematics'])

const MAX_KEYWORDS = 3
const MAX_TOP_PAPERS = 3

function tokenize(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((t) => t.length >= 2 && t.length <= 24 && !/^\d+$/.test(t))
}

function contentToken(token: string): boolean {
  return !STOPWORDS.has(token)
}

interface TermCounts {
  unigrams: Map<string, number>
  bigrams: Map<string, number>
}

function countTerms(titles: string[]): TermCounts {
  const unigrams = new Map<string, number>()
  const bigrams = new Map<string, number>()
  for (const title of titles) {
    const tokens = tokenize(title)
    for (const token of tokens) {
      if (contentToken(token)) unigrams.set(token, (unigrams.get(token) ?? 0) + 1)
    }
    // Only adjacent words form a phrase: without this, dropping a stopword
    // turns "mistake detection in procedural errors" into "detection procedural".
    for (let i = 0; i + 1 < tokens.length; i++) {
      if (!contentToken(tokens[i]) || !contentToken(tokens[i + 1])) continue
      const bigram = `${tokens[i]} ${tokens[i + 1]}`
      bigrams.set(bigram, (bigrams.get(bigram) ?? 0) + 1)
    }
  }
  return { unigrams, bigrams }
}

function idf(term: string, docFrequency: Map<string, number>, clusterCount: number): number {
  const df = docFrequency.get(term) ?? 1
  return Math.log((1 + clusterCount) / (1 + df))
}

/**
 * Rank terms for one community, bigrams first when they score higher. A
 * selected phrase suppresses the single words it already contains so the label
 * reads "video understanding · temporal" rather than three overlapping tokens.
 */
function labelTerms(
  counts: TermCounts,
  clusterCount: number,
  dfUnigrams: Map<string, number>,
  dfBigrams: Map<string, number>,
): string[] {
  if (clusterCount < 2) return []
  const scored: { term: string; score: number }[] = []
  for (const [term, count] of counts.bigrams) {
    scored.push({ term, score: count * 1.6 * idf(term, dfBigrams, clusterCount) })
  }
  for (const [term, count] of counts.unigrams) {
    scored.push({ term, score: count * idf(term, dfUnigrams, clusterCount) })
  }
  scored.sort((a, b) => b.score - a.score || a.term.localeCompare(b.term))

  const chosen: string[] = []
  for (const { term, score } of scored) {
    if (score <= 0) break
    if (chosen.some((c) => c.includes(term) || term.includes(c))) continue
    chosen.push(term)
    if (chosen.length === MAX_KEYWORDS) break
  }
  return chosen
}

function shortTitle(title: string): string {
  const head = title.split(/[:—–]/)[0].trim()
  const text = head.length >= 8 ? head : title.trim()
  return text.length > 28 ? `${text.slice(0, 27)}…` : text
}

function dominantField(nodes: NetworkNode[]): string | null {
  const counts = new Map<string, number>()
  for (const node of nodes) {
    const field = node.fieldsOfStudy?.[0]
    if (!field || GENERIC_FIELDS.has(field.toLowerCase())) continue
    counts.set(field, (counts.get(field) ?? 0) + 1)
  }
  let best: string | null = null
  let bestCount = 0
  for (const [field, count] of counts) {
    if (count > bestCount || (count === bestCount && best !== null && field.localeCompare(best) < 0)) {
      best = field
      bestCount = count
    }
  }
  return best
}

function yearRangeOf(nodes: NetworkNode[]): [number, number] | null {
  let min = Infinity
  let max = -Infinity
  for (const node of nodes) {
    if (typeof node.year !== 'number' || !Number.isFinite(node.year)) continue
    if (node.year < min) min = node.year
    if (node.year > max) max = node.year
  }
  return min === Infinity ? null : [min, max]
}

/**
 * Summarise every community in the currently visible graph, largest first.
 * Pure and deterministic, so it can label the legend for any filtered view
 * without another crawl or a graph-cache version bump.
 */
export function summarizeClusters(nodes: NetworkNode[]): ClusterSummary[] {
  if (nodes.length === 0) return []

  const groups = new Map<number, NetworkNode[]>()
  for (const node of nodes) {
    const group = groups.get(node.clusterId)
    if (group) group.push(node)
    else groups.set(node.clusterId, [node])
  }

  const clusterCount = groups.size
  const perCluster = new Map<number, TermCounts>()
  const dfUnigrams = new Map<string, number>()
  const dfBigrams = new Map<string, number>()
  for (const [id, members] of groups) {
    const counts = countTerms(members.map((n) => n.title || n.label || ''))
    perCluster.set(id, counts)
    for (const term of counts.unigrams.keys()) dfUnigrams.set(term, (dfUnigrams.get(term) ?? 0) + 1)
    for (const term of counts.bigrams.keys()) dfBigrams.set(term, (dfBigrams.get(term) ?? 0) + 1)
  }

  const summaries: ClusterSummary[] = []
  for (const [id, members] of groups) {
    const keywords = labelTerms(perCluster.get(id)!, clusterCount, dfUnigrams, dfBigrams)
    const topField = dominantField(members)
    const topPapers = [...members]
      .filter((n) => (n.title || n.label || '').trim().length > 0)
      .sort((a, b) => b.pageRankScore - a.pageRankScore || b.citationCount - a.citationCount)
      .slice(0, MAX_TOP_PAPERS)
      .map((n) => ({ id: n.id, title: n.title || n.label, citationCount: n.citationCount, year: n.year }))

    const label = keywords.length
      ? keywords.join(' · ')
      : (topField ?? (topPapers[0] ? shortTitle(topPapers[0].title) : `簇 ${id}`))

    summaries.push({
      id,
      label,
      keywords,
      size: members.length,
      share: members.length / nodes.length,
      color: clusterColor(id),
      yearRange: yearRangeOf(members),
      topField,
      topPapers,
    })
  }

  return summaries.sort((a, b) => b.size - a.size || a.id - b.id)
}

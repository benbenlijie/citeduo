import { env } from './env'

/** Parse an env number; missing/blank/non-finite values fall back to ``d``. */
export const num = (v: string | undefined, d: number): number => {
  if (!v) return d
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

/** Hostnames only the operator of this instance can reach. */
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '0:0:0:0:0:0:0:1'])

export type PaperContentMode = 'full' | 'off'

/**
 * May this instance fetch, store and serve arXiv full text?
 *
 * arXiv's API terms allow retrieving and storing the *content* of e-prints "for
 * your own personal use, or for research purposes", and forbid storing and
 * serving e-prints from your servers unless the licence permits redistribution
 * (https://info.arxiv.org/help/api/tou.html). A loopback instance has exactly
 * one reader — the operator — so the full reader stays on there. An instance
 * other people can reach defaults to abstract plus a link to arXiv, and the
 * operator has to opt in explicitly with PAPER_CONTENT_MODE=full.
 */
export function resolvePaperContentMode(explicit: string | undefined, hostname: string): PaperContentMode {
  const v = explicit?.trim().toLowerCase()
  if (v === 'full' || v === 'off') return v
  return LOOPBACK_HOSTS.has(hostname) ? 'full' : 'off'
}

export const config = {
  crawl: {
    maxExecutionMs: num(Bun.env.CRAWL_MAX_MS, 45000),
    s2BatchSize: num(Bun.env.S2_BATCH_SIZE, 100),
    perBatchDelayMs: num(Bun.env.S2_BATCH_DELAY_MS, 1000),
    maxNodes: num(Bun.env.CRAWL_MAX_NODES, 200),
    defaultDepth: num(Bun.env.CRAWL_DEPTH, 2),
    refLimit: [12, 8, 5, 3] as const,
    citeLimit: [10, 5, 2, 0] as const,
    /**
     * How many of a batch's papers get their citing list fetched separately.
     *
     * The citing side used to ride along in the batch response, which cost up to
     * 1000 rows (~200 KB) per paper regardless of `citeLimit`. Fetching it per
     * paper instead is cheap per call but is one call per paper, so cap how many
     * papers per level are worth it: the highest-ranked ones, which are the ones
     * whose successors shape the graph.
     */
    citeFetchLimit: num(Bun.env.CRAWL_CITE_FETCH_LIMIT, 20),
  },
  cache: {
    networkTtlHours: num(Bun.env.NETWORK_TTL_HOURS, 24),
    paperTtlHours: num(Bun.env.PAPER_TTL_HOURS, 168),
    graphVersion: 6,
  },
  s2: {
    base: 'https://api.semanticscholar.org/graph/v1',
    apiKey: env.semanticScholarApiKey,
    contactEmail: env.contactEmail,
    minIntervalMs: num(Bun.env.S2_MIN_INTERVAL_MS, 1000),
  },
  openalex: {
    base: 'https://api.openalex.org',
    apiKey: env.openalexApiKey,
    minIntervalMs: num(Bun.env.OPENALEX_MIN_INTERVAL_MS, 200),
  },
  related: {
    recommendLimit: num(Bun.env.RELATED_RECOMMEND_LIMIT, 10),
    relatedNodeBudget: num(Bun.env.RELATED_NODE_BUDGET, 15),
    couplingMin: num(Bun.env.COUPLING_MIN, 2),
    openalexLimit: num(Bun.env.OPENALEX_RELATED_LIMIT, 10),
    embeddingBatch: num(Bun.env.EMBEDDING_BATCH, 100),
    embeddingK: num(Bun.env.EMBEDDING_K, 5),
    embeddingMinSim: num(Bun.env.EMBEDDING_MIN_SIM, 0.8),
  },
  connect: {
    /** Live S2 batch fetches allowed while hunting for a connection. */
    maxExpansions: num(Bun.env.CONNECT_MAX_EXPANSIONS, 6),
    batchSize: num(Bun.env.CONNECT_BATCH_SIZE, 30),
    frontierLimit: num(Bun.env.CONNECT_FRONTIER_LIMIT, 60),
    /** References / citations kept per expanded paper. */
    refLimit: num(Bun.env.CONNECT_REF_LIMIT, 40),
    citeLimit: num(Bun.env.CONNECT_CITE_LIMIT, 25),
    maxHops: num(Bun.env.CONNECT_MAX_HOPS, 6),
    maxPaths: num(Bun.env.CONNECT_MAX_PATHS, 3),
    maxExecutionMs: num(Bun.env.CONNECT_MAX_MS, 25000),
    /** Cosine similarity above which two papers count as semantically linked. */
    semanticMinSim: num(Bun.env.CONNECT_SEMANTIC_MIN_SIM, 0.75),
    /** Force offline: only walk relations already stored in SQLite. */
    localOnly: (Bun.env.CONNECT_LOCAL_ONLY ?? '0') === '1',
  },
  arxiv: {
    base: 'http://export.arxiv.org/api',
    /**
     * arXiv API terms of use: "make no more than one request every three
     * seconds, and limit requests to a single connection at a time."
     * https://info.arxiv.org/help/api/tou.html
     */
    apiMinIntervalMs: num(Bun.env.ARXIV_API_MIN_INTERVAL_MS, 3000),
    /**
     * Floor between on-demand fetches of a paper's HTML/PDF.
     *
     * arxiv.org/robots.txt asks every crawler for `Crawl-delay: 15`. This is not
     * a crawler: it fetches at most one page per paper the user is opening right
     * now, caches it, and never walks the site. So the floor is a politeness
     * guard against a burst of readers, not the crawler delay — raise it to
     * 15000 for a strictly literal reading, or leave the full-text reader off
     * entirely on a public instance.
     */
    contentMinIntervalMs: num(Bun.env.ARXIV_CONTENT_MIN_INTERVAL_MS, 1000),
    /** Circuit breaker: stop fetching content after this many pages in an hour. */
    contentMaxPerHour: num(Bun.env.ARXIV_CONTENT_MAX_PER_HOUR, 60),
    contentMode: resolvePaperContentMode(Bun.env.PAPER_CONTENT_MODE, env.hostname),
    /**
     * How many CC0 abstracts to keep in memory when content mode is `off`.
     * Bounded so a busy public instance cannot grow without limit; oldest entries
     * are evicted first (Map insertion order). `0` (or negative) disables the memo.
     * Non-finite env values fall back to 500 via ``num``.
     */
    abstractMemoMax: num(Bun.env.ABSTRACT_MEMO_MAX, 500),
  },
  ai: {
    enabled: (Bun.env.OPENCODE_ENABLED ?? '1') !== '0',
    // When set, do NOT spawn opencode locally; connect to this base URL instead
    // (e.g. a locally-run opencode exposed over a reverse SSH tunnel).
    externalBaseUrl: Bun.env.OPENCODE_BASE_URL?.replace(/\/+$/, '') ?? '',
    bin: Bun.env.OPENCODE_BIN ?? 'opencode',
    port: num(Bun.env.OPENCODE_PORT, 4096),
    maxSteps: num(Bun.env.AI_MAX_STEPS, 8),
    contentTtlHours: num(Bun.env.PAPER_CONTENT_TTL_HOURS, 168),
    promptTimeoutMs: num(Bun.env.AI_PROMPT_TIMEOUT_MS, 120000),
  },
  llm: {
    translateTimeoutMs: num(Bun.env.TRANSLATE_TIMEOUT_MS, 120000),
    translateBatchChars: num(Bun.env.TRANSLATE_BATCH_CHARS, 4000),
    translateBatchTexts: num(Bun.env.TRANSLATE_BATCH_TEXTS, 20),
  },
  server: {
    port: env.port,
    hostname: env.hostname,
    accessToken: env.accessToken,
    basePath: env.basePath,
    trustProxy: env.trustProxy,
    rateLimitPerMin: num(Bun.env.RATE_LIMIT_PER_MIN, 120),
  },
} as const

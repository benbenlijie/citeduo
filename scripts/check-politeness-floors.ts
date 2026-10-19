/**
 * Network-free guard: the default upstream spacing in server/config.ts must
 * stay at or above each source's published floor.
 *
 * Run: bun run scripts/check-politeness-floors.ts
 * Wired into CI via .github/workflows/ci.yml.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type Floor = {
  /** Human label for the check failure message. */
  name: string
  /** Env var whose default in config.ts we assert. */
  env: string
  /** Minimum allowed default (ms). */
  floorMs: number
  /** Where the floor is published. */
  sourceUrl: string
  /** Optional note when the floor is a project policy, not a literal vendor rule. */
  note?: string
}

/**
 * Published (or project-policy) floors. Keep the source URL next to each number
 * so a future change can be argued against the same document.
 */
const FLOORS: Floor[] = [
  {
    name: 'arXiv API',
    env: 'ARXIV_API_MIN_INTERVAL_MS',
    floorMs: 3000,
    sourceUrl: 'https://info.arxiv.org/help/api/tou.html',
    note: 'Terms: at most one request every three seconds, single connection.',
  },
  {
    name: 'arXiv paper-page content',
    env: 'ARXIV_CONTENT_MIN_INTERVAL_MS',
    // robots.txt asks crawlers for Crawl-delay: 15. This app is not a crawler
    // (one page per user open, then cache), so the project policy floor is 1000.
    // Raise the default to 15000 for a literal robots.txt reading.
    floorMs: 1000,
    sourceUrl: 'https://arxiv.org/robots.txt',
    note: 'Project politeness floor (1000 ms). robots.txt Crawl-delay is 15 s for crawlers.',
  },
  {
    name: 'Semantic Scholar anonymous',
    env: 'S2_MIN_INTERVAL_MS',
    // Both anonymous and keyed requests use a 1000 ms floor.
    floorMs: 1000,
    sourceUrl: 'https://www.semanticscholar.org/product/api',
    note: 'Anonymous shared-pool spacing used when SEMANTIC_SCHOLAR_API_KEY is unset.',
  },
  {
    name: 'OpenAlex',
    env: 'OPENALEX_MIN_INTERVAL_MS',
    floorMs: 200,
    sourceUrl: 'https://docs.openalex.org/how-to-use-the-api/rate-limits-and-authentication',
    note: 'Default polite-pool spacing (mailto / API key raise the effective quota).',
  },
]

/**
 * Drop comments before parsing. Otherwise a commented-out or merely mentioned
 * `num(Bun.env.X, …)` satisfies the guard while the live default is unsafe.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

/**
 * An integer literal as TypeScript accepts it: digits, optionally grouped with
 * single `_` separators (`3_000`). `literalValue` drops the separators.
 */
const INT = String.raw`(\d+(?:_\d+)*)`
/** Whitespace (including line breaks), an optional trailing comma, then `)`. */
const CLOSE = String.raw`\s*,?\s*\)`

const literalValue = (literal: string) => Number(literal.replaceAll('_', ''))

export function defaultFor(source: string, env: string, keyed = false): number | null {
  const code = stripComments(source)
  const plain = new RegExp(
    String.raw`num\(\s*Bun\.env\.${env}\s*,\s*${INT}${CLOSE}`,
    'g',
  )
  const plainMatches = [...code.matchAll(plain)]

  // Only this positive condition identifies the keyed and anonymous branches.
  // An inverted or unfamiliar condition fails closed rather than guessing.
  const ternary = new RegExp(
    String.raw`num\(\s*Bun\.env\.S2_MIN_INTERVAL_MS\s*,\s*env\.semanticScholarApiKey\s*\?\s*${INT}\s*:\s*${INT}${CLOSE}`,
    'g',
  )
  const ternaryMatches =
    env === 'S2_MIN_INTERVAL_MS' ? [...code.matchAll(ternary)] : []

  // Two definitions of the same default are ambiguous, so refuse to pick one
  // rather than trusting whichever happens to appear first.
  if (plainMatches.length + ternaryMatches.length !== 1) return null

  if (plainMatches.length === 1) return literalValue(plainMatches[0][1])
  return literalValue(ternaryMatches[0][keyed ? 1 : 2])
}

export function checkFloors(source: string): { failures: string[]; successes: string[] } {
  const failures: string[] = []
  const successes: string[] = []

  for (const floor of FLOORS) {
    const actual = defaultFor(source, floor.env)
    if (actual === null) {
      failures.push(
        `${floor.name}: could not determine a single default for ${floor.env} in server/config.ts`,
      )
      continue
    }
    if (actual < floor.floorMs) {
      failures.push(
        `${floor.name}: default ${actual} ms is below published floor ${floor.floorMs} ms ` +
          `(${floor.env}). Source: ${floor.sourceUrl}` +
          (floor.note ? ` — ${floor.note}` : ''),
      )
    } else {
      successes.push(
        `ok  ${floor.name}: default ${actual} ms >= floor ${floor.floorMs} ms (${floor.sourceUrl})`,
      )
    }
  }

  // An API key starts at one request per second on all endpoints.
  const keyed = defaultFor(source, 'S2_MIN_INTERVAL_MS', true)
  const keyedFloor = 1000
  if (keyed === null) {
    failures.push('Semantic Scholar keyed: could not parse keyed default in server/config.ts')
  } else if (keyed < keyedFloor) {
    failures.push(
      `Semantic Scholar keyed: default ${keyed} ms is below floor ${keyedFloor} ms ` +
        `(S2_MIN_INTERVAL_MS with API key). Source: https://www.semanticscholar.org/product/api`,
    )
  } else {
    successes.push(
      `ok  Semantic Scholar keyed: default ${keyed} ms >= floor ${keyedFloor} ms ` +
        `(https://www.semanticscholar.org/product/api)`,
    )
  }

  return { failures, successes }
}

if (import.meta.main) {
  const configPath = resolve(import.meta.dir, '..', 'server', 'config.ts')
  const { failures, successes } = checkFloors(readFileSync(configPath, 'utf8'))
  for (const success of successes) console.log(success)
  if (failures.length) {
    console.error('\nPoliteness floor check failed:')
    for (const failure of failures) console.error(`  - ${failure}`)
    process.exit(1)
  }
  console.log('\nAll upstream politeness floors hold.')
}

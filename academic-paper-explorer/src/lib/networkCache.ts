import type { NetworkData } from '../types/domain'

export interface NodePosition {
  x?: number
  y?: number
  z?: number
}

export type Positions = Record<string, NodePosition>

export interface CachedNetwork {
  savedAt: string
  data: NetworkData
  positions?: Positions
}

export type NetworkCache = Record<string, CachedNetwork>

export const NETWORK_CACHE_STORAGE_KEY = 'citeduo.networkCache.v1'
export const NETWORK_CACHE_LIMIT = 8
export const NETWORK_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
/** Bump when the graph algorithm changes so stale entries are ignored. */
export const NETWORK_GRAPH_VERSION = 9

export function networkCacheKey(paperId: string, depth: number, maxNodes: number): string {
  return `${paperId}|d${depth}|n${maxNodes}|v${NETWORK_GRAPH_VERSION}`
}

function isNetworkData(value: unknown): value is NetworkData {
  if (typeof value !== 'object' || value === null) return false
  const data = value as { nodes?: unknown; edges?: unknown }
  return Array.isArray(data.nodes) && Array.isArray(data.edges)
}

export function parseNetworkCache(raw: string | null): NetworkCache {
  if (!raw) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}

  const out: NetworkCache = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== 'object' || value === null) continue
    const entry = value as Record<string, unknown>
    if (typeof entry.savedAt !== 'string' || !isNetworkData(entry.data)) continue
    out[key] = {
      savedAt: entry.savedAt,
      data: entry.data,
      ...(typeof entry.positions === 'object' && entry.positions !== null
        ? { positions: entry.positions as Positions }
        : {}),
    }
  }
  return out
}

export function serializeNetworkCache(cache: NetworkCache): string {
  return JSON.stringify(cache)
}

export function putNetworkCache(
  cache: NetworkCache,
  key: string,
  entry: CachedNetwork,
  limit = NETWORK_CACHE_LIMIT,
): NetworkCache {
  const next: NetworkCache = { ...cache, [key]: entry }
  const keys = Object.keys(next)
  if (keys.length <= limit) return next

  const keep = keys
    .sort((a, b) => (next[b].savedAt < next[a].savedAt ? -1 : 1))
    .slice(0, limit)
  const pruned: NetworkCache = {}
  for (const k of keep) pruned[k] = next[k]
  return pruned
}

export function isFresh(entry: CachedNetwork, now = Date.now(), ttl = NETWORK_CACHE_TTL_MS): boolean {
  const saved = Date.parse(entry.savedAt)
  return Number.isFinite(saved) && now - saved < ttl
}

export function collectPositions(
  nodes: { id: string; x?: number; y?: number; z?: number }[],
): Positions {
  const out: Positions = {}
  for (const node of nodes) {
    const pos: NodePosition = {}
    if (node.x !== undefined) pos.x = node.x
    if (node.y !== undefined) pos.y = node.y
    if (node.z !== undefined) pos.z = node.z
    if (Object.keys(pos).length === 0) continue
    out[node.id] = pos
  }
  return out
}

export function applyPositions<T extends { id: string; x?: number; y?: number; z?: number }>(
  nodes: T[],
  positions: Positions | undefined,
): T[] {
  if (!positions) return nodes
  for (const node of nodes) {
    const pos = positions[node.id]
    if (!pos) continue
    if (pos.x !== undefined) node.x = pos.x
    if (pos.y !== undefined) node.y = pos.y
    if (pos.z !== undefined) node.z = pos.z
  }
  return nodes
}

function readCache(): NetworkCache {
  try {
    return parseNetworkCache(localStorage.getItem(NETWORK_CACHE_STORAGE_KEY))
  } catch {
    return {}
  }
}

function writeCache(cache: NetworkCache): void {
  try {
    localStorage.setItem(NETWORK_CACHE_STORAGE_KEY, serializeNetworkCache(cache))
  } catch {
    // storage unavailable or quota exceeded — fall back to network
  }
}

export function readCachedNetwork(key: string, now = Date.now()): NetworkData | null {
  const entry = readCache()[key]
  if (!entry || !isFresh(entry, now)) return null
  // Return a fresh object so force-graph/layout mutation never touches the cache.
  return JSON.parse(JSON.stringify(entry.data)) as NetworkData
}

export function writeCachedNetwork(key: string, data: NetworkData): void {
  const cache = readCache()
  const existing = cache[key]
  const entry: CachedNetwork = {
    savedAt: new Date().toISOString(),
    data,
    positions: existing?.positions,
  }
  writeCache(putNetworkCache(cache, key, entry))
}

export function readNetworkPositions(key: string): Positions | undefined {
  return readCache()[key]?.positions
}

export function writeNetworkPositions(key: string, positions: Positions): void {
  const cache = readCache()
  const entry = cache[key]
  if (!entry) return
  writeCache({ ...cache, [key]: { ...entry, positions } })
}

export function clearNetworkCache(): void {
  try {
    localStorage.removeItem(NETWORK_CACHE_STORAGE_KEY)
  } catch {
    // ignore
  }
}

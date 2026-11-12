import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import type { Paper } from '../types/domain'
import { networkCacheKey, readCachedNetwork, writeCachedNetwork } from '../lib/networkCache'
import { resolvePaperKey } from '../lib/paperKey'

/**
 * Kept for the network/URL callers; delegates to the one shared resolver so the
 * id used in `?paper=` is the same key the library stores.
 */
export function resolveClientId(p: Paper | null): string | null {
  return resolvePaperKey(p)
}

/** Adaptive depth/maxNodes when the URL did not pin them. */
export function resolveNetworkParams(paper: Paper | null, depth?: number, maxNodes?: number) {
  const year = paper?.publication_year ?? paper?.year ?? 0
  const citations = paper?.citation_count ?? 0
  // A paper restored from a bare `?paper=` shared link is initially only a
  // lightweight stub: it has an id, but no year or citation count. Treating
  // that missing metadata as "old paper" (year 0 < 2015) wrongly switches the
  // graph to 1/50, while the same paper opened through search uses the normal
  // 2/100 graph and pins it into the URL. Unknown metadata must therefore use
  // the normal defaults; adaptive sizing only applies once metadata is present.
  // (Canonical links always carry d/mn, so they keep the sender's choice.)
  const hasMetadata = paper !== null && (paper?.publication_year != null || paper?.year != null || citations > 0)
  const adaptive = hasMetadata && (year < 2015 || citations > 1000)
  return {
    depth: depth ?? (adaptive ? 1 : 2),
    maxNodes: maxNodes ?? (adaptive ? 50 : 100),
  }
}

export function networkCacheKeyForPaper(
  paper: Paper | null,
  depth?: number,
  maxNodes?: number,
): string | null {
  const id = resolveClientId(paper)
  if (!id) return null
  const params = resolveNetworkParams(paper, depth, maxNodes)
  return networkCacheKey(id, params.depth, params.maxNodes)
}

export function usePaperNetwork(paper: Paper | null, depth?: number, maxNodes?: number) {
  const paperId = resolveClientId(paper)
  const params = resolveNetworkParams(paper, depth, maxNodes)
  const key = paperId ? networkCacheKey(paperId, params.depth, params.maxNodes) : ''

  return useQuery({
    queryKey: ['network', paperId, params.depth, params.maxNodes],
    enabled: !!paperId,
    // Serve a fresh local copy instantly (no crawl, no loading flash).
    initialData: () => (paperId ? readCachedNetwork(key) ?? undefined : undefined),
    queryFn: async () => {
      const data = await api.networkWithPolling(paperId!, params.depth, params.maxNodes)
      writeCachedNetwork(key, data)
      return data
    },
    staleTime: Infinity,
    retry: 1,
  })
}

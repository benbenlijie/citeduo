import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import type { PaperConnection } from '../types/domain'

/**
 * Ask the server how two papers are connected.
 *
 * Unlike the network query this is not polled: `/api/connect` answers in one
 * shot (the server caps its own crawl at `CONNECT_MAX_MS`). Results are cached
 * for ten minutes because a live search can cost tens of upstream requests.
 */
export function usePaperConnection(
  fromId: string | null,
  toId: string | null,
  enabled = true,
  live?: boolean,
) {
  return useQuery<PaperConnection>({
    // `live` is part of the key: flipping the upstream toggle must re-ask
    // instead of serving the answer the other mode produced.
    queryKey: ['connection', fromId, toId, live ?? 'default'],
    enabled: enabled && !!fromId && !!toId && fromId !== toId,
    queryFn: () => api.connect(fromId!, toId!, live),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })
}

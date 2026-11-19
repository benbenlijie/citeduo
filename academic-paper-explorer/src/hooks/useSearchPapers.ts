import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import { trackConversionEvent } from '../lib/conversion'

export function useSearchPapers(params: { query: string; query_type: string } | null) {
  return useQuery({
    queryKey: ['search', params],
    enabled: !!params,
    queryFn: async () => {
      const result = await api.search(params!.query, params!.query_type)
      if ((result.papers?.length ?? 0) > 0) {
        trackConversionEvent('paper_search_success')
      }
      return result
    },
    staleTime: 5 * 60 * 1000,
  })
}

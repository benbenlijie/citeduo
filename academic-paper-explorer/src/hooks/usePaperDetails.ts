import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'

export function usePaperDetails(paperId: string | null) {
  const paperQuery = useQuery({
    queryKey: ['paper-details', paperId],
    enabled: !!paperId,
    queryFn: () => api.details(paperId!),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })
  const relatedQuery = useQuery({
    queryKey: ['paper-details-related', paperId],
    enabled: !!paperId && !!paperQuery.data?.paper,
    queryFn: () => api.detailsRelated(paperQuery.data!.paper.id),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
  return {
    ...paperQuery,
    data: paperQuery.data
      ? { ...paperQuery.data, ...relatedQuery.data }
      : undefined,
  }
}

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePaperDetails } from './usePaperDetails'

const apiMock = vi.hoisted(() => ({ details: vi.fn(), detailsRelated: vi.fn() }))
vi.mock('../services/api', () => ({ api: apiMock }))

const paper = { id: 'p1', title: 'Fast paper', citation_count: 1 }
function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => { apiMock.details.mockReset(); apiMock.detailsRelated.mockReset() })

describe('usePaperDetails', () => {
  it('returns the paper before optional related data finishes', async () => {
    let resolveRelated!: (value: unknown) => void
    apiMock.details.mockResolvedValue({ paper })
    apiMock.detailsRelated.mockReturnValue(new Promise((resolve) => { resolveRelated = resolve }))

    const { result } = renderHook(() => usePaperDetails('p1'), { wrapper })
    await waitFor(() => expect(result.current.data?.paper).toEqual(paper))
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data?.recommendations).toBeUndefined()

    resolveRelated({ recommendations: [{ paperId: 'r1' }], citation_contexts: [] })
    await waitFor(() => expect(result.current.data?.recommendations).toHaveLength(1))
  })
})

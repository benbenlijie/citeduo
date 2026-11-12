import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePaperNetwork } from './usePaperNetwork'
import { networkCacheKey, writeCachedNetwork } from '../lib/networkCache'
import type { NetworkData, Paper } from '../types/domain'

const apiMock = vi.hoisted(() => ({ networkWithPolling: vi.fn() }))
vi.mock('../services/api', () => ({ api: { networkWithPolling: apiMock.networkWithPolling } }))

const paper: Paper = {
  id: 'p',
  title: 'T',
  citation_count: 10,
  authors: '',
  source: 'semantic_scholar',
  year: 2020,
}

const data: NetworkData = { nodes: [], edges: [] }

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  localStorage.clear()
  apiMock.networkWithPolling.mockReset()
})

describe('usePaperNetwork', () => {
  it('uses the normal graph defaults for a shared-link paper stub', async () => {
    apiMock.networkWithPolling.mockResolvedValue(data)
    const sharedStub: Paper = {
      id: 'shared',
      title: '',
      citation_count: 0,
      authors: '',
      source: 'semantic_scholar',
    }

    const { result } = renderHook(() => usePaperNetwork(sharedStub), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual(data))
    expect(apiMock.networkWithPolling).toHaveBeenCalledWith('shared', 2, 100)
  })

  it('serves a fresh local cache without calling the API', async () => {
    writeCachedNetwork(networkCacheKey('p', 2, 100), data)
    const { result } = renderHook(() => usePaperNetwork(paper), { wrapper })
    expect(result.current.data).toEqual(data)
    await new Promise((r) => setTimeout(r, 20))
    expect(apiMock.networkWithPolling).not.toHaveBeenCalled()
  })

  it('fetches and caches when there is no local copy', async () => {
    apiMock.networkWithPolling.mockResolvedValue(data)
    const { result } = renderHook(() => usePaperNetwork(paper), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual(data))
    expect(apiMock.networkWithPolling).toHaveBeenCalledWith('p', 2, 100)
  })
})

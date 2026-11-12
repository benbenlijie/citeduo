import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePaperConnection } from './usePaperConnection'
import type { PaperConnection } from '../types/domain'

const apiMock = vi.hoisted(() => ({ connect: vi.fn() }))
vi.mock('../services/api', () => ({ api: { connect: apiMock.connect } }))

const data = {
  from: { id: 'A' },
  to: { id: 'B' },
  found: true,
  best: null,
  alternatives: [],
  signals: {
    sharedReferences: [],
    sharedCiters: [],
    semanticSimilarity: null,
    sharedFields: [],
    sharedAuthors: [],
  },
  stats: { expanded: 2, nodes: 2, edges: 0, elapsedMs: 12, source: 'local', truncated: false, upstreamUnavailable: false },
} as unknown as PaperConnection

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => apiMock.connect.mockReset())

describe('usePaperConnection', () => {
  it('does not fetch without both endpoints', async () => {
    renderHook(() => usePaperConnection('A', null), { wrapper })
    renderHook(() => usePaperConnection(null, 'B'), { wrapper })
    await new Promise((r) => setTimeout(r, 20))
    expect(apiMock.connect).not.toHaveBeenCalled()
  })

  it('does not fetch when both endpoints are the same paper', async () => {
    renderHook(() => usePaperConnection('A', 'A'), { wrapper })
    await new Promise((r) => setTimeout(r, 20))
    expect(apiMock.connect).not.toHaveBeenCalled()
  })

  it('does not fetch while disabled', async () => {
    renderHook(() => usePaperConnection('A', 'B', false), { wrapper })
    await new Promise((r) => setTimeout(r, 20))
    expect(apiMock.connect).not.toHaveBeenCalled()
  })

  it('fetches the connection for two papers', async () => {
    apiMock.connect.mockResolvedValue(data)
    const { result } = renderHook(() => usePaperConnection('A', 'B'), { wrapper })
    await waitFor(() => expect(result.current.data).toEqual(data))
    expect(apiMock.connect).toHaveBeenCalledWith('A', 'B', undefined)
  })

  it('passes the upstream decision through, and re-asks when it flips', async () => {
    apiMock.connect.mockResolvedValue(data)
    const { rerender } = renderHook(({ live }) => usePaperConnection('A', 'B', true, live), {
      wrapper,
      initialProps: { live: false as boolean | undefined },
    })
    await waitFor(() => expect(apiMock.connect).toHaveBeenCalledWith('A', 'B', false))
    rerender({ live: true })
    await waitFor(() => expect(apiMock.connect).toHaveBeenCalledWith('A', 'B', true))
  })
})

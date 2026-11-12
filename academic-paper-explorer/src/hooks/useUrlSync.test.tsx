import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { useUrlSync } from './useUrlSync'
import { useUiStore } from '../store/useUiStore'
import { parseUrlState } from '../graph/urlState'

let nav: ReturnType<typeof useNavigate>

function Harness() {
  useUrlSync()
  const loc = useLocation()
  nav = useNavigate()
  return <div data-testid="search">{loc.search}</div>
}

function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Harness />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useUiStore.setState({
    selectedPaper: null, selectedNodeId: null, graphDepth: null, graphMaxNodes: null,
    comparePaper: null, compareSelectedNodeId: null,
    expandedNodeIds: [], compareExpandedNodeIds: [],
    graphView: '2d', colorMode: 'cluster', sizeMode: 'citations', timelineYear: null,
    filters: { yearRange: [1990, new Date().getFullYear()], minCitations: 0, selectedFields: [], selectedVenues: [] },
    connectionOpen: false, connectionFrom: null, connectionTo: null,
    connectionRequest: null, connection: null,
  })
})

describe('useUrlSync', () => {
  it('hydrates the store from the URL on mount', () => {    renderAt('/?paper=DOI:10.1/x&d=2&mn=120&view=3d&color=year&tl=2015')
    const s = useUiStore.getState()
    expect(s.selectedPaper?.id).toBe('DOI:10.1/x')
    expect(s.graphDepth).toBe(2)
    expect(s.graphMaxNodes).toBe(120)
    expect(s.graphView).toBe('3d')
    expect(s.colorMode).toBe('year')
    expect(s.timelineYear).toBe(2015)
  })

  it('writes store changes back into the URL', () => {
    renderAt('/')
    act(() => {
      useUiStore.getState().submitQuery({ query: 'x', query_type: 'keyword' })
      useUiStore.getState().setTimelineYear(2020)
    })
    expect(screen.getByTestId('search').textContent).toContain('tl=2020')
  })

  it('encodes the selected root paper and view params', () => {
    renderAt('/')
    act(() => {
      useUiStore.getState().selectRootPaper({
        id: 'ABC', title: 't', citation_count: 1, authors: 'a', source: 'semantic_scholar',
      })
      useUiStore.getState().setGraphView('3d')
    })
    const search = screen.getByTestId('search').textContent ?? ''
    expect(search).toContain('paper=ABC')
    expect(search).toContain('view=3d')
  })

  it('does not clobber a deep link during hydration', () => {
    renderAt('/?paper=ABC&view=3d')
    const search = screen.getByTestId('search').textContent ?? ''
    expect(search).toContain('paper=ABC')
    expect(search).toContain('view=3d')
  })

  it('pins the normal default graph params for a bare shared link', () => {
    // `?paper=` alone carries no year/citations, so the stub must not trigger
    // adaptive sizing: the recipient should get the same 2/100 graph as the
    // sender's search result, not the 1/50 used for old / highly cited papers.
    renderAt('/?paper=SHARED')
    const search = screen.getByTestId('search').textContent ?? ''
    expect(search).toContain('d=2')
    expect(search).toContain('mn=100')
    expect(useUiStore.getState().graphDepth).toBeNull()
  })

  it('re-hydrates on back navigation without pushing extra history', () => {
    renderAt('/?paper=A&view=3d')
    act(() => nav('/?paper=B&view=3d'))
    expect(screen.getByTestId('search').textContent).toContain('paper=B')
    act(() => nav(-1))
    expect(screen.getByTestId('search').textContent).toContain('paper=A')
    expect(useUiStore.getState().selectedPaper?.id).toBe('A')
  })

  it('does not leak previous filters into a navigation that omits them', () => {
    renderAt('/?paper=A&cit=50')
    act(() => nav('/?paper=B'))
    const search = screen.getByTestId('search').textContent ?? ''
    expect(search).not.toContain('cit')
    expect(useUiStore.getState().filters.minCitations).toBe(0)
  })

  it('hydrates compare params from the URL', () => {
    renderAt('/?paper=A&paper2=B&node2=n2')
    const s = useUiStore.getState()
    expect(s.comparePaper?.id).toBe('B')
    expect(s.compareSelectedNodeId).toBe('n2')
  })

  it('writes the compare paper into the URL', () => {
    renderAt('/?paper=A')
    act(() =>
      useUiStore.getState().setComparePaper({
        id: 'B', title: 't', citation_count: 0, authors: '', source: 'semantic_scholar',
      }),
    )
    expect(screen.getByTestId('search').textContent).toContain('paper2=B')
  })

  it('pins the resolved graph params so a shared link rebuilds the same network', () => {
    renderAt('/')
    act(() => {
      useUiStore.getState().selectRootPaper({
        id: 'ABC', title: 't', citation_count: 10, authors: 'a',
        source: 'semantic_scholar', publication_year: 2020,
      })
    })
    const search = screen.getByTestId('search').textContent ?? ''
    // Non-adaptive paper: depth 2 / maxNodes 100 must be pinned, so a recipient
    // opening the link never has to re-derive the parameters from a stub.
    expect(search).toContain('d=2')
    expect(search).toContain('mn=100')
  })

  it('pins adaptive params for older papers', () => {
    renderAt('/')
    act(() => {
      useUiStore.getState().selectRootPaper({
        id: 'OLD', title: '', citation_count: 0, authors: '',
        source: 'semantic_scholar', publication_year: 2000,
      })
    })
    const search = screen.getByTestId('search').textContent ?? ''
    expect(search).toContain('d=1')
    expect(search).toContain('mn=50')
  })

  it('hydrates expanded node ids from the URL', () => {
    renderAt('/?paper=A&e=n1&e=n2&paper2=B&e2=m1')
    const s = useUiStore.getState()
    expect(s.expandedNodeIds).toEqual(['n1', 'n2'])
    expect(s.compareExpandedNodeIds).toEqual(['m1'])
  })

  it('writes expanded node ids into the URL', () => {
    renderAt('/?paper=A')
    act(() => {
      useUiStore.getState().setComparePaper({
        id: 'B', title: 't', citation_count: 0, authors: '', source: 'semantic_scholar',
      })
      useUiStore.getState().addExpandedNode('n1')
      useUiStore.getState().addCompareExpandedNode('m1')
    })
    const search = screen.getByTestId('search').textContent ?? ''
    expect(search).toContain('e=n1')
    expect(search).toContain('e2=m1')
  })

  it('hydrates the connection pair from the URL', () => {
    renderAt('/?from=A&to=B')
    const s = useUiStore.getState()
    expect(s.connectionFrom?.id).toBe('A')
    expect(s.connectionTo?.id).toBe('B')
  })

  it('auto-runs the relation analysis when both ids are present', () => {
    renderAt('/?from=A&to=B')
    const s = useUiStore.getState()
    expect(s.connectionRequest).toEqual({ fromId: 'A', toId: 'B' })
    expect(s.connectionOpen).toBe(true)
  })

  it('auto-runs at most once for a non-canonically ordered link', () => {
    const spy = vi.spyOn(useUiStore.getState(), 'requestConnection')
    renderAt('/?to=B&from=A')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('A', 'B')
    spy.mockRestore()
  })

  it('does not auto-run when only one id is present', () => {
    renderAt('/?from=A')
    const s = useUiStore.getState()
    expect(s.connectionFrom?.id).toBe('A')
    expect(s.connectionTo).toBeNull()
    expect(s.connectionRequest).toBeNull()
  })

  it('does not auto-run when both ids are identical', () => {
    renderAt('/?from=A&to=A')
    expect(useUiStore.getState().connectionRequest).toBeNull()
  })

  it('does not re-run the analysis for a pair we wrote ourselves', () => {
    const spy = vi.spyOn(useUiStore.getState(), 'requestConnection')
    renderAt('/')
    act(() => {
      useUiStore.getState().connectPair(
        { id: 'A', title: 't', citation_count: 0, authors: '', source: 'semantic_scholar' },
        { id: 'B', title: 't', citation_count: 0, authors: '', source: 'semantic_scholar' },
      )
    })
    expect(spy).not.toHaveBeenCalled()
    const search = screen.getByTestId('search').textContent ?? ''
    expect(search).toContain('from=A')
    expect(search).toContain('to=B')
    spy.mockRestore()
  })

  it('clears a stale pair when a navigation omits from/to', () => {
    renderAt('/?from=A&to=B')
    act(() => nav('/?paper=X'))
    const s = useUiStore.getState()
    expect(s.connectionFrom).toBeNull()
    expect(s.connectionTo).toBeNull()
    expect(screen.getByTestId('search').textContent ?? '').not.toContain('from=')
  })

  it('drops ?from/?to when the pair is forgotten, so a refresh starts clean', () => {
    renderAt('/?from=A&to=B')
    act(() => useUiStore.getState().clearConnectionPair())
    const search = screen.getByTestId('search').textContent ?? ''
    expect(search).not.toContain('from=')
    expect(search).not.toContain('to=')
    // The address bar is what a refresh replays, and it must hold no pair —
    // otherwise the auto-run in the hydration effect would resurrect it.
    const reloaded = parseUrlState(search)
    expect(reloaded.connectionFromId).toBeNull()
    expect(reloaded.connectionToId).toBeNull()
  })
})

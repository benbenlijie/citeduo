import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../services/api', () => ({ api: { networkWithPolling: vi.fn() } }))

const fg2dProps = vi.hoisted(() => ({ current: null as any }))

vi.mock('react-force-graph-2d', () => ({
  default: (props: any) => {
    fg2dProps.current = props
    return (
      <div data-testid="fg2d">
        <button data-testid="node-a-click" onClick={() => props.onNodeClick({ id: 'a', title: 'A' })}>
          click
        </button>
        <button data-testid="node-a-hover" onClick={() => props.onNodeHover({ id: 'a', title: 'A' })}>
          hover
        </button>
        <button
          data-testid="node-a-rightclick"
          onClick={() =>
            props.onNodeRightClick(
              { id: 'a', title: 'A', url: 'https://example.test/a' },
              { clientX: 12, clientY: 34, preventDefault() {} },
            )
          }
        >
          rightclick
        </button>
        <button data-testid="background" onClick={() => props.onBackgroundClick()}>
          bg
        </button>
      </div>
    )
  },
}))

const NETWORK = {
  nodes: [
    {
      id: 'a', label: 'A', title: 'A', citationCount: 1, authors: '', isRoot: true,
      pageRankScore: 0.5, clusterId: 0, size: 20, color: '#ffffff', year: 2000,
    },
    {
      id: 'b', label: 'B', title: 'B', citationCount: 1, authors: '', isRoot: false,
      pageRankScore: 0.2, clusterId: 1, size: 20, color: '#ffffff', year: 2010,
    },
  ],
  edges: [{ from: 'a', to: 'b', type: 'reference', weight: 1 }],
}

let mockState: { data: typeof NETWORK | null; isLoading: boolean; error: Error | null } = {
  data: NETWORK,
  isLoading: false,
  error: null,
}

vi.mock('../hooks/usePaperNetwork', () => ({
  usePaperNetwork: () => mockState,
  networkCacheKeyForPaper: (paper: { id?: string } | null) => (paper?.id ? `key:${paper.id}` : null),
}))

import NetworkGraph from './NetworkGraph'
import { useUiStore } from '../store/useUiStore'
import { api } from '../services/api'
import { EDGE_COLORS, withAlpha } from '../graph/encoding'

beforeEach(() => {
  mockState = { data: NETWORK, isLoading: false, error: null }
  ;(api.networkWithPolling as ReturnType<typeof vi.fn>).mockReset()
  useUiStore.setState({
    selectedPaper: null,
    selectedNodeId: null,
    graphQuery: '',
    graphView: '2d',
    timelineYear: null,
    timelinePlaying: false,
    submittedQuery: null,
    comparePaper: null,
    compareSelectedNodeId: null,
    expandedNodeIds: [],
    compareExpandedNodeIds: [],
    connectionOpen: false,
    connectionFrom: null,
    connectionTo: null,
    connectionRequest: null,
    connection: null,
  })
})

/** A coupling path A -> X -> B where X only exists as a connection node. */
const CONNECTION = {
  from: { id: 'a', title: 'A' },
  to: { id: 'b', title: 'B' },
  found: true,
  best: {
    kind: 'coupling',
    nodeIds: ['a', 'x', 'b'],
    nodes: [
      { ...NETWORK.nodes[0] },
      {
        id: 'x', label: 'X', title: 'X', citationCount: 1, authors: '', isRoot: false,
        pageRankScore: 0.1, clusterId: 0, size: 20, color: '#ffffff', year: 2005,
      },
      { ...NETWORK.nodes[1] },
    ],
    edges: [
      { from: 'a', to: 'x', type: 'reference', weight: 1 },
      { from: 'b', to: 'x', type: 'reference', weight: 1 },
    ],
    hops: [],
    hopCount: 2,
    score: 3,
    summary: '共同引用',
  },
  alternatives: [],
  signals: {
    sharedReferences: [], sharedCiters: [], semanticSimilarity: null, sharedFields: [], sharedAuthors: [],
  },
  stats: { expanded: 2, nodes: 3, edges: 3, elapsedMs: 10, source: 'local', truncated: false },
} as any

/** Two four-paper communities, so the legend has two topic rows to highlight. */
const CLUSTER_NETWORK = {
  nodes: [
    { ...NETWORK.nodes[0], title: 'Graph Neural Networks', label: 'Graph Neural Networks' },
    {
      id: 'b', label: 'Graph Neural Networks for Chemistry', title: 'Graph Neural Networks for Chemistry',
      citationCount: 4, authors: '', isRoot: false, pageRankScore: 0.2, clusterId: 0,
      size: 20, color: '#ffffff', year: 2010,
    },
    {
      id: 'c', label: 'Vision Transformers', title: 'Vision Transformers',
      citationCount: 3, authors: '', isRoot: false, pageRankScore: 0.2, clusterId: 1,
      size: 20, color: '#ffffff', year: 2021,
    },
    {
      id: 'd', label: 'Vision Transformers at Scale', title: 'Vision Transformers at Scale',
      citationCount: 2, authors: '', isRoot: false, pageRankScore: 0.1, clusterId: 1,
      size: 20, color: '#ffffff', year: 2022,
    },
  ],
  edges: [
    { from: 'a', to: 'b', type: 'reference', weight: 1 },
    { from: 'b', to: 'c', type: 'reference', weight: 1 },
    { from: 'c', to: 'd', type: 'reference', weight: 1 },
  ],
}

/** A graph with two edge types and a non-root link, so focus can be told apart from selection. */
const FOCUS_NETWORK = {
  nodes: [
    { ...NETWORK.nodes[0] },
    { ...NETWORK.nodes[1] },
    {
      id: 'c', label: 'C', title: 'C', citationCount: 1, authors: '', isRoot: false,
      pageRankScore: 0.1, clusterId: 2, size: 20, color: '#ffffff', year: 2005,
    },
  ],
  edges: [
    { from: 'a', to: 'b', type: 'reference', weight: 1 },
    { from: 'b', to: 'c', type: 'reference', weight: 1 },
    { from: 'a', to: 'c', type: 'semantic', weight: 0.5 },
  ],
}

describe('NetworkGraph', () => {
  it('renders the graph after data arrives following a loading state', () => {
    mockState = { data: null, isLoading: true, error: null }
    const { rerender } = render(<NetworkGraph />)
    expect(screen.queryByTestId('fg2d')).not.toBeInTheDocument()
    mockState = { data: NETWORK, isLoading: false, error: null }
    rerender(<NetworkGraph />)
    expect(screen.getByTestId('fg2d')).toBeInTheDocument()
  })

  it('keeps the timeline range stable when filtering by year', () => {
    render(<NetworkGraph />)
    const before = screen.getByRole('slider')
    const max = before.getAttribute('max')
    const min = before.getAttribute('min')
    expect(max).toBe('2010')
    fireEvent.change(before, { target: { value: '2005' } })
    const after = screen.getByRole('slider')
    expect(after.getAttribute('max')).toBe(max)
    expect(after.getAttribute('min')).toBe(min)
    expect((after as HTMLInputElement).value).toBe('2005')
  })

  it('selects the root node when the graph first loads', () => {
    useUiStore.setState({
      selectedPaper: { id: 'root', title: 'Root', citation_count: 0, authors: '', source: 'semantic_scholar' },
    })
    render(<NetworkGraph />)
    expect(useUiStore.getState().selectedNodeId).toBe('a')
  })

  it('selects a node on a single click', () => {
    render(<NetworkGraph />)
    fireEvent.click(screen.getByTestId('node-a-click'))
    expect(useUiStore.getState().selectedNodeId).toBe('a')
  })

  it('rebuilds the network on a double click', () => {
    render(<NetworkGraph />)
    const node = screen.getByTestId('node-a-click')
    fireEvent.click(node)
    fireEvent.click(node)
    expect(useUiStore.getState().selectedPaper?.id).toBe('a')
  })

  it('clears selection when the background is clicked', () => {
    render(<NetworkGraph />)
    fireEvent.click(screen.getByTestId('node-a-click'))
    fireEvent.click(screen.getByTestId('background'))
    expect(useUiStore.getState().selectedNodeId).toBeNull()
  })

  it('selects into the compare slot and clears the primary selection', () => {
    useUiStore.setState({ selectedNodeId: 'b' })
    render(
      <NetworkGraph
        paper={{ id: 'root', title: 'Root', citation_count: 0, authors: '', source: 'semantic_scholar' }}
        slot="compare"
      />,
    )
    fireEvent.click(screen.getByTestId('node-a-click'))
    expect(useUiStore.getState().compareSelectedNodeId).toBe('a')
    expect(useUiStore.getState().selectedNodeId).toBeNull()
  })

  it('opens a node context menu and re-roots the graph', () => {
    render(<NetworkGraph />)
    fireEvent.click(screen.getByTestId('node-a-rightclick'))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('menuitem', { name: '以此为根重建网络' }))
    expect(useUiStore.getState().selectedPaper?.id).toBe('a')
  })

  it('searches by the node title from the context menu', () => {
    render(<NetworkGraph />)
    fireEvent.click(screen.getByTestId('node-a-rightclick'))
    fireEvent.click(screen.getByRole('menuitem', { name: '按标题搜索' }))
    expect(useUiStore.getState().submittedQuery).toEqual({ query: 'A', query_type: 'keyword' })
  })

  it('expands a node and merges its neighbors into the graph', async () => {
    ;(api.networkWithPolling as ReturnType<typeof vi.fn>).mockResolvedValue({
      nodes: [
        { id: 'z', label: 'Z', title: 'Z', citationCount: 0, authors: '', isRoot: false, pageRankScore: 0, clusterId: 0, size: 1, color: '#fff', year: 2005 },
      ],
      edges: [{ from: 'a', to: 'z', type: 'reference', weight: 1 }],
    })
    render(<NetworkGraph />)
    fireEvent.click(screen.getByTestId('node-a-rightclick'))
    fireEvent.click(screen.getByRole('menuitem', { name: '展开该节点' }))
    await waitFor(() => expect(screen.getByText(/3 节点/)).toBeInTheDocument())
  })

  it('records the expanded node id in the store so it can be shared', async () => {
    ;(api.networkWithPolling as ReturnType<typeof vi.fn>).mockResolvedValue({
      nodes: [
        { id: 'z', label: 'Z', title: 'Z', citationCount: 0, authors: '', isRoot: false, pageRankScore: 0, clusterId: 0, size: 1, color: '#fff', year: 2005 },
      ],
      edges: [{ from: 'a', to: 'z', type: 'reference', weight: 1 }],
    })
    render(<NetworkGraph />)
    fireEvent.click(screen.getByTestId('node-a-rightclick'))
    fireEvent.click(screen.getByRole('menuitem', { name: '展开该节点' }))
    await waitFor(() => expect(useUiStore.getState().expandedNodeIds).toContain('a'))
  })

  it('merges a connection path into the displayed graph', () => {
    render(<NetworkGraph />)
    expect(screen.getByText('2 节点 · 1 边')).toBeInTheDocument()
    // X is not in the network payload at all; it arrives with the path.
    act(() => useUiStore.setState({ connection: CONNECTION }))
    expect(screen.getByText('3 节点 · 3 边')).toBeInTheDocument()
  })

  it('keeps a connection path visible through filters that would hide it', () => {
    // A timeline cut-off at 2000 would drop B (2010) and X (2005) on its own.
    act(() => useUiStore.setState({ connection: CONNECTION, timelineYear: 2000 }))
    render(<NetworkGraph />)
    expect(screen.getByText('3 节点 · 3 边')).toBeInTheDocument()
  })

  it('does not draw the primary pane connection in the compare pane', () => {
    useUiStore.setState({ connection: CONNECTION })
    render(
      <NetworkGraph
        paper={{ id: 'root', title: 'Root', citation_count: 0, authors: '', source: 'semantic_scholar' }}
        slot="compare"
      />,
    )
    expect(screen.getByText('2 节点 · 1 边')).toBeInTheDocument()
  })

  it('sets the connection endpoints from the node context menu', () => {
    render(<NetworkGraph />)
    fireEvent.click(screen.getByTestId('node-a-rightclick'))
    fireEvent.click(screen.getByText('设为关联起点'))
    expect(useUiStore.getState().connectionFrom?.id).toBe('a')
    expect(useUiStore.getState().connectionOpen).toBe(true)

    fireEvent.click(screen.getByTestId('node-a-rightclick'))
    fireEvent.click(screen.getByText('设为关联终点'))
    expect(useUiStore.getState().connectionTo?.id).toBe('a')
  })

  it('offers to clear the path only while one is on screen', () => {
    render(<NetworkGraph />)
    fireEvent.click(screen.getByTestId('node-a-rightclick'))
    expect(screen.queryByText('清除关联路径')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('background'))

    act(() => useUiStore.setState({ connection: CONNECTION }))
    fireEvent.click(screen.getByTestId('node-a-rightclick'))
    fireEvent.click(screen.getByText('清除关联路径'))
    expect(useUiStore.getState().connection).toBeNull()
  })

  it('forgets the whole pair from the node menu, so the link stops restoring it', () => {
    useUiStore.setState({
      connectionFrom: { id: 'a', title: 'A', citation_count: 0, authors: '', source: 'semantic_scholar' },
      connectionTo: { id: 'b', title: 'B', citation_count: 0, authors: '', source: 'semantic_scholar' },
    })
    render(<NetworkGraph />)
    fireEvent.click(screen.getByTestId('node-a-rightclick'))
    fireEvent.click(screen.getByText('清除关联论文'))
    const s = useUiStore.getState()
    expect(s.connectionFrom).toBeNull()
    expect(s.connectionTo).toBeNull()
  })

  it('re-expands nodes restored from the store so a shared link keeps them', async () => {
    ;(api.networkWithPolling as ReturnType<typeof vi.fn>).mockResolvedValue({
      nodes: [
        { id: 'z', label: 'Z', title: 'Z', citationCount: 0, authors: '', isRoot: false, pageRankScore: 0, clusterId: 0, size: 1, color: '#fff', year: 2005 },
      ],
      edges: [{ from: 'a', to: 'z', type: 'reference', weight: 1 }],
    })
    useUiStore.setState({
      selectedPaper: { id: 'root', title: 'Root', citation_count: 0, authors: '', source: 'semantic_scholar' },
      expandedNodeIds: ['a'],
    })
    render(<NetworkGraph />)
    await waitFor(() => expect(api.networkWithPolling).toHaveBeenCalledWith('a', 1, 50))
    await waitFor(() => expect(screen.getByText(/3 节点/)).toBeInTheDocument())
  })

  it('lights only root-connected links of the previewed type after a one-second legend dwell', () => {
    vi.useFakeTimers()
    try {
      mockState = { data: FOCUS_NETWORK, isLoading: false, error: null }
      useUiStore.setState({ selectedNodeId: 'a' })
      render(<NetworkGraph />)

      const linkOf = (type: string, from: string, to: string) =>
        fg2dProps.current.graphData.links.find(
          (l: any) =>
            l.type === type &&
            String(l.source?.id ?? l.source) === from &&
            String(l.target?.id ?? l.target) === to,
        )
      const nodeOf = (id: string) =>
        fg2dProps.current.graphData.nodes.find((n: any) => n.id === id)

      // Baseline: selecting the root keeps its direct links lit.
      expect(fg2dProps.current.linkColor(linkOf('reference', 'a', 'b'))).toBe(EDGE_COLORS.reference)
      expect(fg2dProps.current.linkColor(linkOf('semantic', 'a', 'c'))).toBe(EDGE_COLORS.semantic)
      expect(fg2dProps.current.nodeColor(nodeOf('c'))).toBe(nodeOf('c').color)

      const button = screen.getByRole('button', { name: /前置工作/ })
      fireEvent.mouseOver(button)
      act(() => {
        vi.advanceTimersByTime(999)
      })
      expect(fg2dProps.current.linkColor(linkOf('semantic', 'a', 'c'))).toBe(EDGE_COLORS.semantic)

      act(() => {
        vi.advanceTimersByTime(1)
      })
      // a->b touches the root; b->c is the same type but hangs off b.
      expect(fg2dProps.current.linkColor(linkOf('reference', 'a', 'b'))).toBe(EDGE_COLORS.reference)
      expect(fg2dProps.current.linkColor(linkOf('reference', 'b', 'c'))).toBe(
        withAlpha(EDGE_COLORS.reference, 0.06),
      )
      expect(fg2dProps.current.linkColor(linkOf('semantic', 'a', 'c'))).toBe(
        withAlpha(EDGE_COLORS.semantic, 0.06),
      )
      expect(fg2dProps.current.nodeColor(nodeOf('a'))).toBe(nodeOf('a').color)
      expect(fg2dProps.current.nodeColor(nodeOf('b'))).toBe(nodeOf('b').color)
      expect(fg2dProps.current.nodeColor(nodeOf('c'))).toBe('#2a2f3a')
      expect(screen.getByRole('button', { name: /前置工作/ })).toHaveTextContent('仅看此类')

      fireEvent.mouseOut(button)
      expect(fg2dProps.current.linkColor(linkOf('semantic', 'a', 'c'))).toBe(EDGE_COLORS.semantic)
      expect(fg2dProps.current.nodeColor(nodeOf('c'))).toBe(nodeOf('c').color)
      expect(screen.queryByText('仅看此类')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not preview a type when the pointer leaves before the dwell', () => {
    vi.useFakeTimers()
    try {
      mockState = { data: FOCUS_NETWORK, isLoading: false, error: null }
      useUiStore.setState({ selectedNodeId: 'a' })
      render(<NetworkGraph />)

      const semantic = () =>
        fg2dProps.current.graphData.links.find((l: any) => l.type === 'semantic')
      const button = screen.getByRole('button', { name: /前置工作/ })
      fireEvent.mouseOver(button)
      act(() => {
        vi.advanceTimersByTime(400)
      })
      fireEvent.mouseOut(button)
      act(() => {
        vi.advanceTimersByTime(1500)
      })

      expect(fg2dProps.current.linkColor(semantic())).toBe(EDGE_COLORS.semantic)
    } finally {
      vi.useRealTimers()
    }
  })
  it('highlights one community from the legend and restores the graph afterwards', () => {
    mockState = { data: CLUSTER_NETWORK, isLoading: false, error: null }
    render(<NetworkGraph />)
    // The root is auto-selected on load; clear it so only the community dims.
    act(() => useUiStore.setState({ selectedNodeId: null, selectedPaper: null }))

    const nodeOf = (id: string) =>
      fg2dProps.current.graphData.nodes.find((n: any) => n.id === id)
    const linkOf = (from: string, to: string) =>
      fg2dProps.current.graphData.links.find(
        (l: any) =>
          String(l.source?.id ?? l.source) === from && String(l.target?.id ?? l.target) === to,
      )

    fireEvent.mouseOver(screen.getByRole('button', { name: /vision transformers/ }))
    // Inside the highlighted community stays lit; outside it fades.
    expect(fg2dProps.current.nodeColor(nodeOf('c'))).toBe(nodeOf('c').color)
    expect(fg2dProps.current.nodeColor(nodeOf('d'))).toBe(nodeOf('d').color)
    expect(fg2dProps.current.nodeColor(nodeOf('b'))).toBe('#2a2f3a')
    expect(fg2dProps.current.nodeColor(nodeOf('a'))).toBe(nodeOf('a').color)
    expect(fg2dProps.current.linkColor(linkOf('c', 'd'))).toBe(EDGE_COLORS.reference)
    expect(fg2dProps.current.linkColor(linkOf('b', 'c'))).toBe(
      withAlpha(EDGE_COLORS.reference, 0.05),
    )
    expect(fg2dProps.current.linkColor(linkOf('a', 'b'))).toBe(
      withAlpha(EDGE_COLORS.reference, 0.05),
    )

    // Clicking pins the community even after the pointer leaves.
    const row = screen.getByRole('button', { name: /vision transformers/ })
    fireEvent.click(row)
    fireEvent.mouseOut(row)
    expect(fg2dProps.current.nodeColor(nodeOf('b'))).toBe('#2a2f3a')

    // Clicking the pinned row again clears it.
    fireEvent.click(row)
    expect(fg2dProps.current.nodeColor(nodeOf('b'))).toBe(nodeOf('b').color)
    expect(fg2dProps.current.nodeColor(nodeOf('a'))).toBe(nodeOf('a').color)
  })

})

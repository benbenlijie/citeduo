import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ConnectionPanel from './ConnectionPanel'
import { useUiStore } from '../store/useUiStore'
import type { Paper, PaperConnection } from '../types/domain'

const configMock = vi.hoisted(() => ({ getConfig: vi.fn() }))
vi.mock('../services/api', () => ({ api: { getConfig: configMock.getConfig } }))

const hookMock = vi.hoisted(() => ({ value: {} as Record<string, unknown>, args: [] as unknown[] }))
vi.mock('../hooks/usePaperConnection', () => ({
  usePaperConnection: (...args: unknown[]) => {
    hookMock.args = args
    return { data: undefined, isFetching: false, error: null, ...hookMock.value }
  },
}))

// useGraphSelection reads the two panes' cached networks to label the "图上选中的节点"
// candidate. Serve them from a table instead of the real API.
const networkMock = vi.hoisted(() => ({ byId: {} as Record<string, { nodes: unknown[] }> }))
vi.mock('../hooks/usePaperNetwork', () => ({
  usePaperNetwork: (p: { id?: string } | null) => ({ data: p?.id ? networkMock.byId[p.id] : undefined }),
}))

const paper = (id: string, title = id): Paper => ({
  id,
  title,
  citation_count: 0,
  authors: '',
  source: 'semantic_scholar',
})

const node = (id: string, title: string) => ({
  id,
  label: title,
  title,
  citationCount: 0,
  authors: '',
  isRoot: false,
  pageRankScore: 0,
  clusterId: 0,
  size: 8,
  color: '#ffffff',
})

const connection = (over: Partial<PaperConnection> = {}): PaperConnection =>
  ({
    from: node('A', '论文甲'),
    to: node('B', '论文乙'),
    found: true,
    best: {
      kind: 'coupling',
      nodeIds: ['A', 'X', 'B'],
      nodes: [node('A', '论文甲'), node('X', '共同祖先'), node('B', '论文乙')],
      edges: [
        { from: 'A', to: 'X', type: 'reference', weight: 1 },
        { from: 'B', to: 'X', type: 'reference', weight: 1 },
      ],
      hops: [
        { from: 'A', to: 'X', type: 'reference', forward: true, text: '论文甲 引用了 共同祖先' },
        { from: 'B', to: 'X', type: 'reference', forward: true, text: '论文乙 引用了 共同祖先' },
      ],
      hopCount: 2,
      score: 3,
      summary: '两篇论文共同引用了 共同祖先',
    },
    alternatives: [],
    signals: {
      sharedReferences: [node('X', '共同祖先')],
      sharedCiters: [],
      semanticSimilarity: null,
      sharedFields: ['ML'],
      sharedAuthors: [],
    },
    stats: { expanded: 2, nodes: 3, edges: 2, elapsedMs: 40, source: 'local', truncated: false, upstreamUnavailable: false },
    ...over,
  }) as unknown as PaperConnection

beforeEach(() => {
  configMock.getConfig.mockResolvedValue({ connectLocalOnly: false })
  hookMock.args = []
  hookMock.value = { data: undefined, isFetching: false, error: null }
  networkMock.byId = {}
  useUiStore.setState({
    selectedPaper: null,
    comparePaper: null,
    connectionOpen: true,
    connectionFrom: null,
    connectionTo: null,
    connectionRequest: null,
    connection: null,
  })
})

describe('ConnectionPanel visibility', () => {
  it('renders nothing while the panel is closed', () => {
    useUiStore.setState({ connectionOpen: false })
    const { container } = render(<ConnectionPanel />)
    expect(container).toBeEmptyDOMElement()
  })

  it('closes itself from the header button', () => {
    render(<ConnectionPanel />)
    fireEvent.click(screen.getByRole('button', { name: '关闭关联路径面板' }))
    expect(useUiStore.getState().connectionOpen).toBe(false)
  })

  it('clears both endpoints and the answer from the header button', () => {
    useUiStore.setState({
      connectionFrom: paper('A', '论文甲'),
      connectionTo: paper('B', '论文乙'),
      connectionRequest: { fromId: 'A', toId: 'B' },
      connection: connection(),
    })
    render(<ConnectionPanel />)
    fireEvent.click(screen.getByRole('button', { name: '清除关联' }))
    const s = useUiStore.getState()
    expect(s.connectionFrom).toBeNull()
    expect(s.connectionTo).toBeNull()
    expect(s.connectionRequest).toBeNull()
    expect(s.connection).toBeNull()
  })
})

describe('ConnectionPanel endpoints', () => {
  it('shows both slots from the store', () => {
    useUiStore.setState({ connectionFrom: paper('A', '论文甲'), connectionTo: paper('B', '论文乙') })
    render(<ConnectionPanel />)
    expect(screen.getByText('论文甲')).toBeInTheDocument()
    expect(screen.getByText('论文乙')).toBeInTheDocument()
  })

  it('shows a placeholder slot when nothing is selected', () => {
    render(<ConnectionPanel />)
    expect(screen.getAllByText('未选择')).toHaveLength(2)
  })

  it('runs a search with the two resolved keys', () => {
    useUiStore.setState({ connectionFrom: paper('A'), connectionTo: paper('B') })
    render(<ConnectionPanel />)
    fireEvent.click(screen.getByRole('button', { name: /查找关联路径/ }))
    expect(useUiStore.getState().connectionRequest).toEqual({ fromId: 'A', toId: 'B' })
  })

  it('refuses to search when both slots hold the same paper', () => {
    useUiStore.setState({ connectionFrom: paper('A'), connectionTo: paper('A') })
    render(<ConnectionPanel />)
    const button = screen.getByRole('button', { name: /查找关联路径/ })
    expect(button).toBeDisabled()
    expect(screen.getByText(/起点与终点是同一篇论文/)).toBeInTheDocument()
  })

  it('swaps the two slots', () => {
    useUiStore.setState({ connectionFrom: paper('A'), connectionTo: paper('B') })
    render(<ConnectionPanel />)
    fireEvent.click(screen.getByRole('button', { name: '交换起点终点' }))
    const s = useUiStore.getState()
    expect(s.connectionFrom?.id).toBe('B')
    expect(s.connectionTo?.id).toBe('A')
  })
})

describe('ConnectionPanel slot picker', () => {
  it('offers the papers currently in play instead of leaving the slot uneditable', () => {
    networkMock.byId = { A: { nodes: [node('N', '图上节点')] } }
    useUiStore.setState({ selectedPaper: paper('A', '论文甲'), comparePaper: paper('B', '论文乙'), selectedNodeId: 'N' })
    render(<ConnectionPanel />)
    fireEvent.click(screen.getByRole('button', { name: '选择关联起点' }))
    expect(screen.getByText('当前论文')).toBeInTheDocument()
    expect(screen.getByText('对比论文')).toBeInTheDocument()
    expect(screen.getByText('图上选中的节点')).toBeInTheDocument()
  })

  it('fills a slot from the candidate menu', () => {
    useUiStore.setState({ selectedPaper: paper('A', '论文甲'), comparePaper: paper('B', '论文乙') })
    render(<ConnectionPanel />)
    fireEvent.click(screen.getByRole('button', { name: '选择关联终点' }))
    fireEvent.click(screen.getByText('当前论文'))
    expect(useUiStore.getState().connectionTo?.id).toBe('A')
  })

  it('resolves a graph node the user selected into a real paper', () => {
    networkMock.byId = { A: { nodes: [node('N', '图上选中的论文')] } }
    useUiStore.setState({ selectedPaper: paper('A', '论文甲'), selectedNodeId: 'N' })
    render(<ConnectionPanel />)
    fireEvent.click(screen.getByRole('button', { name: '选择关联终点' }))
    fireEvent.click(screen.getByText('图上选中的节点'))
    expect(useUiStore.getState().connectionTo?.title).toBe('图上选中的论文')
  })

  it('clears a filled slot', () => {
    useUiStore.setState({ connectionFrom: paper('A', '论文甲') })
    render(<ConnectionPanel />)
    fireEvent.click(screen.getByRole('button', { name: '清除起点' }))
    expect(useUiStore.getState().connectionFrom).toBeNull()
  })

  it('points at the other entry points when there is nothing to offer', () => {
    render(<ConnectionPanel />)
    fireEvent.click(screen.getByRole('button', { name: '选择关联起点' }))
    expect(screen.getByText(/在左侧列表点「关联」/)).toBeInTheDocument()
  })

  it('never offers the paper already sitting in that slot', () => {
    useUiStore.setState({ connectionFrom: paper('A', '论文甲'), selectedPaper: paper('A', '论文甲') })
    render(<ConnectionPanel />)
    fireEvent.click(screen.getByRole('button', { name: '选择关联起点' }))
    expect(screen.getByText(/暂无可选论文/)).toBeInTheDocument()
  })
})

describe('ConnectionPanel results', () => {
  it('explains the found path hop by hop', () => {
    useUiStore.setState({ connection: connection() })
    render(<ConnectionPanel />)
    expect(screen.getByText('文献耦合')).toBeInTheDocument()
    expect(screen.getByText('两篇论文共同引用了 共同祖先')).toBeInTheDocument()
    expect(screen.getByText('论文甲 引用了 共同祖先')).toBeInTheDocument()
    expect(screen.getByText('论文乙 引用了 共同祖先')).toBeInTheDocument()
    // Every path node is listed in walk order.
    expect(screen.getByText('共同祖先')).toBeInTheDocument()
  })

  it('reports the answer came from the local cache', () => {
    useUiStore.setState({ connection: connection() })
    render(<ConnectionPanel />)
    expect(screen.getByText(/来自本地缓存/)).toBeInTheDocument()
  })

  it('mentions a live crawl when the server had to go online', () => {
    const c = connection()
    useUiStore.setState({ connection: { ...c, stats: { ...c.stats, source: 'live' } } })
    render(<ConnectionPanel />)
    expect(screen.getByText(/含联网扩展/)).toBeInTheDocument()
  })

  it('shows the signals alongside a found path', () => {
    useUiStore.setState({ connection: connection() })
    render(<ConnectionPanel />)
    expect(screen.getByText('共同引用 1 篇文献')).toBeInTheDocument()
    expect(screen.getByText('共同领域：ML')).toBeInTheDocument()
  })

  it('explains a miss instead of failing silently', () => {
    useUiStore.setState({
      connection: connection({
        found: false,
        best: null,
        signals: {
          sharedReferences: [],
          sharedCiters: [node('M', '综述')],
          semanticSimilarity: 0.61,
          sharedFields: [],
          sharedAuthors: ['李四'],
        },
      }),
    })
    render(<ConnectionPanel />)
    expect(screen.getByText('没有找到引用链路、共同引用或语义关联。')).toBeInTheDocument()
    expect(screen.getByText('共同被 1 篇文献引用')).toBeInTheDocument()
    expect(screen.getByText('语义相似度 0.610')).toBeInTheDocument()
    expect(screen.getByText('共同作者：李四')).toBeInTheDocument()
  })

  it('warns that a cache-only answer is incomplete', () => {
    const c = connection()
    useUiStore.setState({ connection: { ...c, stats: { ...c.stats, upstreamUnavailable: true } } })
    render(<ConnectionPanel />)
    expect(screen.getByText('上游不可用')).toBeInTheDocument()
  })

  it('explains a miss caused by an unreachable upstream', () => {
    const c = connection({ found: false, best: null })
    useUiStore.setState({ connection: { ...c, stats: { ...c.stats, upstreamUnavailable: true } } })
    render(<ConnectionPanel />)
    expect(screen.getByText(/本次结论只基于本地缓存/)).toBeInTheDocument()
  })

  it('tells the user a live search is in progress', () => {
    hookMock.value = { data: undefined, isFetching: true, error: null }
    useUiStore.setState({ connectionRequest: { fromId: 'A', toId: 'B' } })
    render(<ConnectionPanel />)
    expect(screen.getByText(/正在从本地缓存与 Semantic Scholar/)).toBeInTheDocument()
  })

  it('surfaces a search error', () => {
    hookMock.value = { data: undefined, isFetching: false, error: new Error('上游限流') }
    useUiStore.setState({ connectionRequest: { fromId: 'A', toId: 'B' } })
    render(<ConnectionPanel />)
    expect(screen.getByText('上游限流')).toBeInTheDocument()
  })
})

describe('ConnectionPanel upstream toggle', () => {
  it('defaults to the server setting and passes it to the query', async () => {
    configMock.getConfig.mockResolvedValue({ connectLocalOnly: false })
    useUiStore.setState({ connectionRequest: { fromId: 'A', toId: 'B' } })
    render(<ConnectionPanel />)
    const box = await screen.findByRole('checkbox', { name: /允许联网扩展/ })
    expect(box).toBeChecked()
    await waitFor(() => expect(hookMock.args[3]).toBe(true))
  })

  it('starts unchecked and can be turned off, which reaches the query', async () => {
    configMock.getConfig.mockResolvedValue({ connectLocalOnly: false })
    useUiStore.setState({ connectionRequest: { fromId: 'A', toId: 'B' } })
    render(<ConnectionPanel />)
    const box = await screen.findByRole('checkbox', { name: /允许联网扩展/ })
    fireEvent.click(box)
    expect(box).not.toBeChecked()
    await waitFor(() => expect(hookMock.args[3]).toBe(false))
  })

  it('disables upstream entirely when the operator turned it off', async () => {
    configMock.getConfig.mockResolvedValue({ connectLocalOnly: true })
    render(<ConnectionPanel />)
    expect(await screen.findByText(/本实例已关闭联网扩展/)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(hookMock.args[3]).toBe(false)
  })
})

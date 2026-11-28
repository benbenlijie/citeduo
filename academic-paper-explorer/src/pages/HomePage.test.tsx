import React from 'react'
import { act, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HomePage from './HomePage'
import { useUiStore } from '../store/useUiStore'

vi.mock('../components/SearchBar', () => ({ default: () => <div data-testid="search-bar" /> }))
vi.mock('../components/PaperList', () => ({ default: () => <div data-testid="paper-list" /> }))
vi.mock('../components/NetworkGraph', () => ({ default: () => <div data-testid="network-graph" /> }))
vi.mock('../components/DetailsPanel', () => ({ default: () => <div data-testid="details-panel" /> }))
vi.mock('../components/ConnectionPanel', () => ({ default: () => null }))
vi.mock('../components/ConnectionCapsule', () => ({ default: () => null }))
vi.mock('../components/FilterPanel', () => ({ default: () => null }))
vi.mock('../components/StarConversionPrompt', () => ({ HeaderStarLink: () => null }))
const configMock = vi.hoisted(() => ({ getConfig: vi.fn() }))
vi.mock('../services/api', () => ({ api: configMock }))
vi.mock('../hooks/usePaperNetwork', () => ({ usePaperNetwork: () => ({ data: null }) }))
vi.mock('../hooks/useUrlSync', () => ({ useUrlSync: () => undefined }))
vi.mock('../lib/conversion', () => ({
  recordDemoStartOnce: vi.fn(),
  recordNetworkViewOnce: vi.fn(),
}))
vi.mock('../components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  ResizablePanel: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  ResizableHandle: () => null,
}))

const paper = {
  id: 'paper-1',
  title: 'Paper',
  authors: '',
  citation_count: 0,
  source: 'semantic_scholar' as const,
}

beforeEach(() => {
  configMock.getConfig.mockResolvedValue({ connectLocalOnly: false, icpBeianNumber: null })
  useUiStore.setState({
    selectedPaper: null,
    submittedQuery: null,
    comparePaper: null,
  })
})

it('shows the official filing link only once a number is configured', async () => {
  const number = '测试ICP备00000000号-1'
  configMock.getConfig.mockResolvedValue({ connectLocalOnly: false, icpBeianNumber: number })
  render(<HomePage />)
  expect(screen.queryByRole('link', { name: number })).not.toBeInTheDocument()
  expect(await screen.findByRole('link', { name: number })).toHaveAttribute('href', 'https://beian.miit.gov.cn/')
})

describe('mobile pane selection', () => {
  it('shows the list when a search is submitted', () => {
    render(<HomePage />)

    act(() => useUiStore.getState().submitQuery({ query: 'attention', query_type: 'keyword' }))

    expect(screen.getByRole('tab', { name: '列表' })).toHaveAttribute('aria-selected', 'true')
    expect(within(screen.getByRole('tabpanel')).getByTestId('paper-list')).toBeInTheDocument()
  })

  it('shows the graph after a paper is selected', () => {
    render(<HomePage />)
    act(() => useUiStore.getState().submitQuery({ query: 'attention', query_type: 'keyword' }))
    act(() => useUiStore.getState().selectRootPaper(paper))

    expect(screen.getByRole('tab', { name: '图谱' })).toHaveAttribute('aria-selected', 'true')
    expect(within(screen.getByRole('tabpanel')).getByTestId('network-graph')).toBeInTheDocument()
  })
})

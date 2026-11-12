import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DetailsPanel from './DetailsPanel'
import { useUiStore } from '../store/useUiStore'
import { useNotesStore } from '../store/useNotesStore'
import { useLibraryStore } from '../store/useLibraryStore'

const renderPanel = () => render(<MemoryRouter><DetailsPanel /></MemoryRouter>)

const lineageMock = vi.hoisted(() => ({ value: undefined as unknown }))
vi.mock('../hooks/usePaperLineage', () => ({
  usePaperLineage: () => ({ data: lineageMock.value, isLoading: false, error: null }),
}))

const detailsMock = vi.hoisted(() => ({ value: { data: undefined, isLoading: false, error: null } as Record<string, unknown> }))
vi.mock('../hooks/usePaperDetails', () => ({
  usePaperDetails: () => detailsMock.value,
}))

beforeEach(() => {
  localStorage.clear()
  lineageMock.value = undefined
  detailsMock.value = { data: undefined, isLoading: false, error: null }
  useNotesStore.setState({ notes: {} })
  useLibraryStore.setState({ library: { favorites: [], collections: [], savedSearches: [] } })
  useUiStore.setState({
    selectedPaper: { id: 'p1', title: 'T', citation_count: 0, authors: '', source: 'semantic_scholar' },
    selectedNodeId: null,
    compareSelectedNodeId: null,
    connectionFrom: null,
    connectionTo: null,
    connectionOpen: false,
    connectionRequest: null,
    connection: null,
  })
})

describe('DetailsPanel notes', () => {
  it('shows the selected paper while full details are loading', () => {
    detailsMock.value = { data: undefined, isLoading: true, error: null }
    renderPanel()
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('shows the existing note and persists edits', () => {
    useNotesStore.setState({ notes: { p1: 'my thought' } })
    renderPanel()

    const box = screen.getByPlaceholderText('记录想法…') as HTMLTextAreaElement
    expect(box.value).toBe('my thought')

    fireEvent.change(box, { target: { value: 'updated' } })

    expect(useNotesStore.getState().notes.p1).toBe('updated')
    expect(screen.getByText('已保存')).toBeInTheDocument()
  })

  it('hides the saved hint when the note is cleared', () => {
    useNotesStore.setState({ notes: { p1: 'my thought' } })
    renderPanel()
    fireEvent.change(screen.getByPlaceholderText('记录想法…'), { target: { value: '' } })
    expect(useNotesStore.getState().notes.p1).toBeUndefined()
    expect(screen.queryByText('已保存')).not.toBeInTheDocument()
  })

  it('prefers the most recently clicked (compare) node', () => {
    useNotesStore.setState({ notes: { a: 'note-a', b: 'note-b' } })
    useUiStore.setState({ selectedNodeId: 'a', compareSelectedNodeId: 'b' })
    renderPanel()
    expect((screen.getByPlaceholderText('记录想法…') as HTMLTextAreaElement).value).toBe('note-b')
  })

  it('opens the in-app reader in a new tab when the paper has an arXiv id', () => {
    useUiStore.setState({
      selectedPaper: {
        id: 'p1', title: 'T', citation_count: 0, authors: '', source: 'semantic_scholar', arxiv_id: '2401.00001',
      },
    })
    renderPanel()
    const link = screen.getByRole('link', { name: /在应用内阅读/ })
    expect(link).toHaveAttribute('href', '/read/2401.00001?pid=p1')
    // The papers page must stay put: the reader opens in a new tab.
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('toggles favorite for the current paper', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: /收藏/ }))
    expect(useLibraryStore.getState().library.favorites).toEqual(['p1'])
  })

  it('keys the library on the Semantic Scholar id rather than the local id', () => {
    useUiStore.setState({
      selectedPaper: {
        id: 'local-1', semantic_scholar_id: 'S2-1', title: 'T', citation_count: 0, authors: '', source: 'semantic_scholar',
      },
    })
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: /收藏/ }))
    expect(useLibraryStore.getState().library.favorites).toEqual(['S2-1'])
  })

  it('confirms the collection a paper was just added to', () => {
    useLibraryStore.setState({
      library: { favorites: [], collections: [{ id: 'c1', name: 'Reading', paperIds: [] }], savedSearches: [] },
    })
    renderPanel()

    fireEvent.change(screen.getByLabelText('加入集合'), { target: { value: 'c1' } })

    expect(useLibraryStore.getState().library.collections[0].paperIds).toEqual(['p1'])
    expect(screen.getByText('已加入「Reading」')).toBeInTheDocument()
  })

  it('says so instead of silently re-adding a paper already in the collection', () => {
    useLibraryStore.setState({
      library: { favorites: [], collections: [{ id: 'c1', name: 'Reading', paperIds: ['p1'] }], savedSearches: [] },
    })
    renderPanel()

    fireEvent.change(screen.getByLabelText('加入集合'), { target: { value: 'c1' } })

    expect(useLibraryStore.getState().library.collections[0].paperIds).toEqual(['p1'])
    expect(screen.getByText('已在「Reading」中')).toBeInTheDocument()
  })

  it('shows the collections holding the paper and removes it on click', () => {
    useLibraryStore.setState({
      library: { favorites: [], collections: [{ id: 'c1', name: 'Reading', paperIds: ['p1'] }], savedSearches: [] },
    })
    renderPanel()

    expect(screen.getByText('已在集合：')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Reading/ }))

    expect(useLibraryStore.getState().library.collections[0].paperIds).toEqual([])
    expect(screen.getByText('已移出「Reading」')).toBeInTheDocument()
    expect(screen.queryByText('已在集合：')).not.toBeInTheDocument()
  })

  it('creates a collection from the prompt and joins it', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('新集合')
    renderPanel()

    fireEvent.change(screen.getByLabelText('加入集合'), { target: { value: '__new' } })

    const collections = useLibraryStore.getState().library.collections
    expect(collections).toHaveLength(1)
    expect(collections[0].name).toBe('新集合')
    expect(collections[0].paperIds).toEqual(['p1'])
    expect(screen.getByText('已新建并加入「新集合」')).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('reuses an existing collection instead of creating a duplicate name', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('Reading')
    useLibraryStore.setState({
      library: { favorites: [], collections: [{ id: 'c1', name: 'Reading', paperIds: [] }], savedSearches: [] },
    })
    renderPanel()

    fireEvent.change(screen.getByLabelText('加入集合'), { target: { value: '__new' } })

    const collections = useLibraryStore.getState().library.collections
    expect(collections).toHaveLength(1)
    expect(collections[0].paperIds).toEqual(['p1'])
    expect(screen.getByText('已加入已有的集合「Reading」')).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('lists prior/follow-up works and selects one on click', () => {
    lineageMock.value = {
      root_id: 'p1',
      prior: [{ paperId: 'r1', title: 'Prior work', year: 2018 }],
      followUps: [{ paperId: 'c1', title: 'Follow work', year: 2024, isInfluential: true }],
    }
    renderPanel()
    expect(screen.getByText('前置工作（参考）')).toBeInTheDocument()
    expect(screen.getByText('后续工作（引用）')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Follow work'))
    expect(useUiStore.getState().selectedNodeId).toBe('c1')
  })
})

describe('DetailsPanel association entry', () => {
  it('offers to relate the paper on screen to the root paper', () => {
    useUiStore.setState({
      selectedPaper: { id: 'p1', title: '被探索的论文', citation_count: 0, authors: '', source: 'semantic_scholar' },
      selectedNodeId: 'p2',
    })
    renderPanel()

    const button = screen.getByRole('button', { name: /与当前论文分析关联/ })
    fireEvent.click(button)

    const s = useUiStore.getState()
    expect(s.connectionFrom?.id).toBe('p1')
    expect(s.connectionTo?.id).toBe('p2')
    expect(s.connectionRequest).toEqual({ fromId: 'p1', toId: 'p2' })
  })

  it('hides the entry while the root paper itself is on screen', () => {
    renderPanel()
    expect(screen.queryByRole('button', { name: /与当前论文分析关联/ })).not.toBeInTheDocument()
  })

  it('stays available while the details request is still in flight', () => {
    detailsMock.value = { data: undefined, isLoading: true, error: null }
    useUiStore.setState({ selectedNodeId: 'p2' })
    renderPanel()
    expect(screen.getByText('T')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /与当前论文分析关联/ })).toBeInTheDocument()
  })

  it('stays available when the details request fails', () => {
    detailsMock.value = { data: undefined, isLoading: false, error: new Error('上游限流') }
    useUiStore.setState({ selectedNodeId: 'p2' })
    renderPanel()
    expect(screen.getByText('加载失败')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /与当前论文分析关联/ })).toBeInTheDocument()
  })

  it('uses the fetched title for the paper it pairs', () => {
    detailsMock.value = {
      data: { paper: { id: 'p2', title: '选中的论文', citation_count: 0, authors: '', source: 'semantic_scholar' } },
      isLoading: false,
      error: null,
    }
    useUiStore.setState({ selectedNodeId: 'p2' })
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: /与当前论文分析关联/ }))
    expect(useUiStore.getState().connectionTo?.title).toBe('选中的论文')
  })

  it('anchors on an already chosen endpoint rather than the root paper', () => {
    useUiStore.setState({
      selectedPaper: { id: 'p1', title: '被探索的论文', citation_count: 0, authors: '', source: 'semantic_scholar' },
      connectionFrom: { id: 'p9', title: '手动起点', citation_count: 0, authors: '', source: 'semantic_scholar' },
      selectedNodeId: 'p2',
    })
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: /与当前论文分析关联/ }))

    const s = useUiStore.getState()
    expect(s.connectionFrom?.id).toBe('p9')
    expect(s.connectionTo?.id).toBe('p2')
  })
})

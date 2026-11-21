import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('../hooks/useSearchPapers', () => ({
  useSearchPapers: () => ({ isFetching: false }),
}))

import SearchBar from './SearchBar'
import { useUiStore } from '../store/useUiStore'
import { useSearchHistoryStore } from '../store/useSearchHistoryStore'
import { useLibraryStore } from '../store/useLibraryStore'

beforeEach(() => {
  localStorage.clear()
  useSearchHistoryStore.setState({ entries: [] })
  useLibraryStore.setState({ library: { favorites: [], collections: [], savedSearches: [] } })
  useUiStore.setState({ submittedQuery: null })
})

describe('SearchBar history', () => {
  it('records a submitted query and shows it on focus', () => {
    render(<SearchBar />)
    const input = screen.getByPlaceholderText(/输入关键词/)
    fireEvent.change(input, { target: { value: 'attention' } })
    fireEvent.click(screen.getByRole('button', { name: '搜索' }))

    expect(useSearchHistoryStore.getState().entries).toEqual(['attention'])
    expect(useUiStore.getState().submittedQuery).toEqual({ query: 'attention', query_type: 'keyword' })

    fireEvent.focus(input)
    expect(screen.getByText('搜索历史')).toBeInTheDocument()
    expect(screen.getByText('attention')).toBeInTheDocument()
  })

  it('runs a search when a history item is clicked', () => {
    useSearchHistoryStore.setState({ entries: ['transformers'] })
    render(<SearchBar />)
    fireEvent.focus(screen.getByPlaceholderText(/输入关键词/))
    fireEvent.click(screen.getByText('transformers'))
    expect(useUiStore.getState().submittedQuery).toEqual({ query: 'transformers', query_type: 'keyword' })
  })

  it('keeps the submit button reachable on narrow screens', () => {
    useSearchHistoryStore.setState({ entries: ['attention'] })
    render(<SearchBar />)
    fireEvent.focus(screen.getByPlaceholderText(/输入关键词/))

    // 窄屏按钮堆叠在输入框下方，历史面板若绝对定位会盖住它而无法提交。
    const panel = screen.getByTestId('search-history-panel')
    expect(panel.className).not.toMatch(/(^|\s)absolute(\s|$)/)
    expect(panel.className).toContain('sm:absolute')
  })

  it('removes and clears history entries', () => {
    useSearchHistoryStore.setState({ entries: ['a', 'b'] })
    render(<SearchBar />)
    fireEvent.focus(screen.getByPlaceholderText(/输入关键词/))

    fireEvent.click(screen.getByRole('button', { name: '删除历史 a' }))
    expect(useSearchHistoryStore.getState().entries).toEqual(['b'])

    fireEvent.click(screen.getByRole('button', { name: '清空' }))
    expect(useSearchHistoryStore.getState().entries).toEqual([])
  })

  it('saves the current search and re-runs a saved search', () => {
    render(<SearchBar />)
    const input = screen.getByPlaceholderText(/输入关键词/)
    fireEvent.change(input, { target: { value: 'attention' } })
    fireEvent.focus(input)
    fireEvent.click(screen.getByRole('button', { name: '保存当前' }))
    expect(useLibraryStore.getState().library.savedSearches[0].query).toBe('attention')

    fireEvent.focus(input)
    fireEvent.click(screen.getByText('attention'))
    expect(useUiStore.getState().submittedQuery).toEqual({ query: 'attention', query_type: 'keyword' })
  })
})

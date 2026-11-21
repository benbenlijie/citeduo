import React, { useState } from 'react'
import { Search, Loader2, History, X } from 'lucide-react'
import { useUiStore } from '../store/useUiStore'
import { useSearchPapers } from '../hooks/useSearchPapers'
import { useSearchHistoryStore } from '../store/useSearchHistoryStore'
import { useLibraryStore } from '../store/useLibraryStore'
import { filterHistory } from '../lib/searchHistory'

const SearchBar: React.FC = () => {
  const { submittedQuery, submitQuery } = useUiStore()
  const entries = useSearchHistoryStore((s) => s.entries)
  const recordHistory = useSearchHistoryStore((s) => s.record)
  const removeHistory = useSearchHistoryStore((s) => s.remove)
  const clearHistory = useSearchHistoryStore((s) => s.clear)
  const savedSearches = useLibraryStore((s) => s.library.savedSearches)
  const saveSearch = useLibraryStore((s) => s.saveSearch)
  const removeSavedSearch = useLibraryStore((s) => s.removeSavedSearch)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'keyword' | 'doi' | 'arxiv' | 's2_id'>('keyword')
  const [showHistory, setShowHistory] = useState(false)

  const { isFetching: isSearching } = useSearchPapers(submittedQuery)
  const suggestions = showHistory ? filterHistory(entries, searchQuery) : []

  const runSearch = (query: string, type: typeof searchType = searchType) => {
    const value = query.trim()
    if (!value) return
    recordHistory(value)
    submitQuery({ query: value, query_type: type })
    setShowHistory(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    runSearch(searchQuery)
  }

  const searchTypeOptions = [
    { value: 'keyword', label: '关键词' },
    { value: 'doi', label: 'DOI' },
    { value: 'arxiv', label: 'arXiv ID' },
    { value: 's2_id', label: 'Semantic Scholar ID' }
  ]

  const getPlaceholder = () => {
    switch (searchType) {
      case 'doi':
        return '输入DOI，例如: 10.1038/nature12373'
      case 'arxiv':
        return '输入arXiv ID，例如: 1706.03762'
      case 's2_id':
        return '输入Semantic Scholar ID'
      default:
        return '输入关键词，例如: attention mechanism, machine learning'
    }
  }

  return (
    <form onSubmit={handleSearch} className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* 搜索类型选择 */}
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value as any)}
          className="min-h-11 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
        >
          {searchTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* 搜索输入框 */}
        <div className="relative min-w-0 flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearching ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setShowHistory(true)}
          onBlur={() => window.setTimeout(() => setShowHistory(false), 120)}
          placeholder={getPlaceholder()}
          className="min-h-11 w-full rounded-lg border border-gray-600 bg-gray-700 py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSearching}
        />

        {showHistory && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-gray-600 bg-gray-700 shadow-lg">
            <div className="flex items-center justify-between px-3 py-1.5 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <History className="h-3 w-3" /> 搜索历史
              </span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => clearHistory()}
                className="hover:text-white"
              >
                清空
              </button>
            </div>
            <ul className="max-h-64 overflow-y-auto">
              {suggestions.map((q) => (
                <li key={q} className="flex items-center hover:bg-gray-600">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSearchQuery(q)
                      runSearch(q)
                    }}
                    className="flex-1 truncate px-3 py-1.5 text-left text-sm text-gray-100"
                  >
                    {q}
                  </button>
                  <button
                    type="button"
                    aria-label={`删除历史 ${q}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => removeHistory(q)}
                    className="mr-2 rounded p-1 text-gray-400 hover:bg-gray-500 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between border-t border-gray-600 px-3 py-1.5 text-xs text-gray-400">
              <span>保存的搜索</span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                disabled={!searchQuery.trim()}
                onClick={() => saveSearch(searchQuery.trim(), searchType)}
                className="hover:text-white disabled:opacity-40"
              >
                保存当前
              </button>
            </div>
            <ul className="max-h-48 overflow-y-auto">
              {savedSearches.length === 0 && (
                <li className="px-3 py-1.5 text-xs text-gray-500">暂无保存的搜索</li>
              )}
              {savedSearches.map((s) => (
                <li key={s.id} className="flex items-center hover:bg-gray-600">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSearchType(s.query_type as typeof searchType)
                      setSearchQuery(s.query)
                      runSearch(s.query, s.query_type as typeof searchType)
                    }}
                    className="flex-1 truncate px-3 py-1.5 text-left text-sm text-gray-100"
                  >
                    {s.query}
                  </button>
                  <button
                    type="button"
                    aria-label={`删除保存的搜索 ${s.query}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => removeSavedSearch(s.id)}
                    className="mr-2 rounded p-1 text-gray-400 hover:bg-gray-500 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        </div>

        {/* 搜索按钮 */}
        <button
          type="submit"
          disabled={isSearching || !searchQuery.trim()}
          className="min-h-11 w-full whitespace-nowrap rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:cursor-not-allowed disabled:bg-gray-600 sm:w-auto"
        >
          {isSearching ? '搜索中...' : '搜索'}
        </button>
      </div>

      {/* 快捷示例 */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm text-gray-400">示例:</span>
        <button
          type="button"
          onClick={() => {
            setSearchType('keyword')
            setSearchQuery('attention mechanism')
          }}
          className="inline-flex min-h-11 items-center text-sm text-blue-400 underline hover:text-blue-300"
        >
          attention mechanism
        </button>
        <span className="text-gray-600">|</span>
        <button
          type="button"
          onClick={() => {
            setSearchType('doi')
            setSearchQuery('10.48550/arXiv.1706.03762')
          }}
          className="inline-flex min-h-11 items-center text-sm text-blue-400 underline hover:text-blue-300"
        >
          Transformer论文
        </button>
      </div>
    </form>
  )
}

export default SearchBar

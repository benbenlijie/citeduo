import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Download, Calendar, Quote, Users, BookOpen, Award, TrendingUp, Globe, ArrowUpRight, ArrowDownLeft, X, Link2 } from 'lucide-react'
import { useUiStore } from '../store/useUiStore'
import { usePaperDetails } from '../hooks/usePaperDetails'
import { usePaperLineage } from '../hooks/usePaperLineage'
import { resolvePaperKey } from '../lib/paperKey'
import { useNotesStore } from '../store/useNotesStore'
import { useLibraryStore } from '../store/useLibraryStore'
import type { LineagePaper, Paper } from '../types/domain'
import { paperStubFromId } from '../graph/urlState'

/**
 * `/api/details` returns a paper shape that is close to `Paper` but lacks
 * `source` and normalises authors differently. Coerce it back so the pair state
 * (and therefore the URL) keeps using one identity.
 */
function asPaper(p: {
  id: string
  title?: string
  authors?: unknown
  citation_count?: number
  year?: number
  publication_year?: number
  venue?: string
  url?: string
  doi?: string
  openalex_id?: string
  semantic_scholar_id?: string
}): Paper {
  return {
    id: p.id,
    title: p.title || p.id,
    authors: typeof p.authors === 'string' ? p.authors : '',
    citation_count: p.citation_count ?? 0,
    year: p.year,
    publication_year: p.publication_year,
    venue: p.venue,
    url: p.url,
    doi: p.doi,
    openalex_id: p.openalex_id,
    semantic_scholar_id: p.semantic_scholar_id,
    source: 'semantic_scholar',
  }
}

const LineageList: React.FC<{
  label: string
  icon: React.ReactNode
  items: LineagePaper[]
  accent: string
  onPick: (id: string) => void
}> = ({ label, icon, items, accent, onPick }) => {
  if (items.length === 0) return null
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
        <span className={accent}>{icon}</span>
        {label}
        <span className="text-xs text-gray-500">{items.length}</span>
      </h4>
      <div className="space-y-1.5">
        {items.map((item) => (
          <button
            key={item.paperId}
            type="button"
            onClick={() => onPick(item.paperId)}
            title={item.title}
            className="w-full rounded bg-gray-700/60 p-2 text-left hover:bg-gray-700"
          >
            <div className="line-clamp-2 text-sm text-white">{item.title || '未知标题'}</div>
            <div className="mt-0.5 text-xs text-gray-400">
              {item.authors && <span className="line-clamp-1">{item.authors}</span>}
              {item.year && <span> · {item.year}</span>}
              {item.citationCount != null && <span> · {item.citationCount} 引用</span>}
              {item.isInfluential && (
                <span className="ml-1 rounded bg-yellow-600/20 px-1.5 py-0.5 text-[10px] text-yellow-300">
                  重要
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

const DetailsPanel: React.FC = () => {
  const {
    selectedNodeId,
    selectedPaper,
    compareSelectedNodeId,
    setSelectedNodeId,
    connectionFrom,
    connectionTo,
    connectPair,
  } = useUiStore()
  const notes = useNotesStore((s) => s.notes)
  const setNote = useNotesStore((s) => s.setNote)
  const library = useLibraryStore((s) => s.library)
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite)
  const createCollection = useLibraryStore((s) => s.createCollection)
  const addToCollection = useLibraryStore((s) => s.addToCollection)
  const removeFromCollection = useLibraryStore((s) => s.removeFromCollection)

  const [collectionNotice, setCollectionNotice] = useState<string | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
  }, [])

  const flashCollectionNotice = (message: string) => {
    setCollectionNotice(message)
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setCollectionNotice(null), 2500)
  }

  // 最近点击优先：对比图选中的节点 > 主图选中的节点 > 主图论文
  const paperId = compareSelectedNodeId || selectedNodeId || resolvePaperKey(selectedPaper)
  const note = paperId ? notes[paperId] ?? '' : ''
  const saved = note.trim().length > 0
  const collectionMemberships = paperId
    ? library.collections.filter((c) => c.paperIds.includes(paperId))
    : []
  const { data: paperDetails, isLoading, error } = usePaperDetails(paperId)
  const { data: lineage } = usePaperLineage(paperId)

  // "Relate this to the paper I am exploring": the anchor is an endpoint the
  // user already picked, else the root paper. Driven by `paperId` rather than
  // the loaded `paper`, so the entry works before (and even without) the
  // details request — the pair only needs ids, and the network cache supplies
  // the title.
  const onScreenKey = paperId
  const anchor = connectionFrom ?? connectionTo ?? selectedPaper
  const anchorKey = resolvePaperKey(anchor)
  const relateTarget = anchor && anchorKey && onScreenKey && anchorKey !== onScreenKey ? anchor : null
  const detailsPaper = paperDetails?.paper
  const relatedPaper: Paper | null = relateTarget
    ? detailsPaper && resolvePaperKey(detailsPaper) === onScreenKey
      ? asPaper(detailsPaper)
      : paperStubFromId(onScreenKey!)
    : null

  const headerBar = (
    <div className="border-b border-gray-700 bg-gray-800 p-4">
      <h2 className="text-lg font-semibold text-white">论文详情</h2>
      {relateTarget && relatedPaper && (
        <button
          type="button"
          onClick={() => connectPair(relateTarget, relatedPaper, { run: true })}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded border border-emerald-600 px-2 py-1.5 text-xs text-emerald-300 hover:bg-emerald-600/20"
          title="分析这篇论文与根论文之间的关联路径"
        >
          <Link2 className="h-3.5 w-3.5" />
          与当前论文分析关联
        </button>
      )}
    </div>
  )

  if (!selectedPaper && !selectedNodeId && !compareSelectedNodeId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center p-6">
          <BookOpen className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">论文详情</h3>
          <p className="text-gray-500 text-sm">
            选择一篇论文或点击网络图中的节点
            <br />
            查看详细信息
          </p>
        </div>
      </div>
    )
  }

  // 网络图节点通常已经带有标题、作者等基础信息；先展示这些内容，
  // 不要让相关推荐和完整详情阻塞整个面板。
  if (isLoading && !selectedPaper) {
    return (
      <div className="flex h-full flex-col overflow-y-auto">
        {headerBar}
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">加载详情中...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col overflow-y-auto">
        {headerBar}
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center p-6">
            <div className="text-red-500 mb-4">加载失败</div>
            <p className="text-gray-500 text-sm">{error.message}</p>
          </div>
        </div>
      </div>
    )
  }

  const paper = paperDetails?.paper || selectedPaper
  if (!paper) return null

  const arxivId = (paper as { arxiv_id?: string }).arxiv_id

  const metrics = paperDetails?.metrics
  const recommendations = paperDetails?.recommendations || []
  const citationContexts = paperDetails?.citation_contexts || []

  // 获取年份信息，兼容不同字段
  const paperYear = paper.year || paper.publication_year

  return (
    <div className="h-full overflow-y-auto">
      {/* 标题栏 */}
      <div className="sticky top-0 z-10">{headerBar}</div>

      <div className="p-4 space-y-6">
        {/* 基本信息 */}
        <div>
          <h3 className="text-base font-medium text-white mb-3 line-clamp-3">
            {paper.title}
          </h3>
          
          {/* 作者 */}
          <div className="flex items-start space-x-2 mb-3">
            <Users className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-300">
              {Array.isArray(paper.authors) ? (
                <div className="space-y-1">
                  {paper.authors.slice(0, 5).map((author, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span>{typeof author === 'string' ? author : author.name}</span>
                      {typeof author === 'object' && author.url && (
                        <a
                          href={author.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                  {paper.authors.length > 5 && (
                    <span className="text-gray-400">... 等 {paper.authors.length} 人</span>
                  )}
                </div>
              ) : (
                <span>{paper.authors || '未知作者'}</span>
              )}
            </div>
          </div>

          {/* 发表信息 */}
          <div className="space-y-2 text-sm text-gray-400">
            {paperYear && (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>{paperYear}</span>
                {paper.venue && <span>· {paper.venue}</span>}
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Quote className="w-4 h-4" />
              <span>{paper.citation_count || 0} 引用</span>
            </div>
          </div>
        </div>

        {/* 收藏 / 集合 */}
        {paperId && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleFavorite(paperId)}
                className={`flex items-center gap-1 rounded px-3 py-1 text-sm ${
                  library.favorites.includes(paperId)
                    ? 'bg-yellow-600/80 text-white'
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >
                ★ {library.favorites.includes(paperId) ? '已收藏' : '收藏'}
              </button>
              <select
                aria-label="加入集合"
                value=""
                onChange={(e) => {
                  const value = e.target.value
                  if (!value || !paperId) return
                  if (value === '__new') {
                    const name = window.prompt('新集合名称')
                    const trimmed = name?.trim()
                    if (!trimmed) return
                    const existing = library.collections.find((c) => c.name === trimmed)
                    if (existing) {
                      addToCollection(existing.id, paperId)
                      flashCollectionNotice(`已加入已有的集合「${trimmed}」`)
                      return
                    }
                    addToCollection(createCollection(trimmed), paperId)
                    flashCollectionNotice(`已新建并加入「${trimmed}」`)
                    return
                  }
                  const target = library.collections.find((c) => c.id === value)
                  if (!target) return
                  if (target.paperIds.includes(paperId)) {
                    flashCollectionNotice(`已在「${target.name}」中`)
                    return
                  }
                  addToCollection(target.id, paperId)
                  flashCollectionNotice(`已加入「${target.name}」`)
                }}
                className="rounded bg-gray-700 px-2 py-1 text-sm text-gray-200"
              >
                <option value="">加入集合…</option>
                {library.collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="__new">＋ 新建集合</option>
              </select>
            </div>

            {collectionMemberships.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-gray-500">已在集合：</span>
                {collectionMemberships.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={`从「${c.name}」移出`}
                    onClick={() => {
                      removeFromCollection(c.id, paperId)
                      flashCollectionNotice(`已移出「${c.name}」`)
                    }}
                    className="flex items-center gap-1 rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-200 hover:bg-red-900/60"
                  >
                    {c.name}
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}

            <div aria-live="polite" className="min-h-[1rem] text-xs text-emerald-400">
              {collectionNotice}
            </div>
          </div>
        )}

        {/* 我的笔记 */}
        {paperId && (          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-medium text-white">我的笔记</h4>
              {saved && <span className="text-xs text-green-400">已保存</span>}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(paperId, e.target.value)}
              placeholder="记录想法…"
              rows={4}
              className="w-full resize-y rounded-lg bg-gray-700 px-3 py-2 text-sm text-gray-100 outline-none placeholder:text-gray-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        {/* 指标 */}
        {metrics && (
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-white mb-3 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              学术指标
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400">H指数</div>
                <div className="text-white font-medium">{metrics.h_index}</div>
              </div>
              <div>
                <div className="text-gray-400">影响因子</div>
                <div className="text-white font-medium">{metrics.impact_factor}</div>
              </div>
            </div>
          </div>
        )}

        {/* 摘要 */}
        {paper.abstract && (
          <div>
            <h4 className="text-sm font-medium text-white mb-2">摘要</h4>
            <p className="text-sm text-gray-300 leading-relaxed">
              {paper.abstract}
            </p>
          </div>
        )}

        {/* 学科领域 */}
        {paper.fields_of_study && paper.fields_of_study.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-white mb-2">学科领域</h4>
            <div className="flex flex-wrap gap-2">
              {paper.fields_of_study.slice(0, 6).map((field, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-600 bg-opacity-20 text-blue-300 text-xs rounded"
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 链接 */}
        <div className="space-y-2">
          {arxivId && (
            <Link
              to={`/read/${encodeURIComponent(arxivId)}${
                paper.id ? `?pid=${encodeURIComponent(paper.id)}` : ''
              }`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 text-sm"
            >
              <BookOpen className="w-4 h-4" />
              <span>在应用内阅读（arXiv HTML）</span>
            </Link>
          )}
          {paper.url && (
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 text-sm"
            >
              <Globe className="w-4 h-4" />
              <span>查看原文</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          
          {paper.pdf_url && (
            <a
              href={paper.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-green-400 hover:text-green-300 text-sm"
            >
              <Download className="w-4 h-4" />
              <span>下载PDF</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* 研究脉络：前置工作 / 后续工作 */}
        {lineage && (lineage.prior.length > 0 || lineage.followUps.length > 0) && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-white">研究脉络</h4>
            <LineageList
              label="前置工作（参考）"
              icon={<ArrowUpRight className="h-4 w-4" />}
              items={lineage.prior}
              accent="text-blue-400"
              onPick={setSelectedNodeId}
            />
            <LineageList
              label="后续工作（引用）"
              icon={<ArrowDownLeft className="h-4 w-4" />}
              items={lineage.followUps}
              accent="text-green-400"
              onPick={setSelectedNodeId}
            />
          </div>
        )}

        {/* 相关推荐 */}
        {recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-white mb-3 flex items-center">
              <Award className="w-4 h-4 mr-2" />
              相关推荐
            </h4>
            <div className="space-y-3">
              {recommendations.slice(0, 5).map((rec, index) => (
                <div key={index} className="bg-gray-700 rounded p-3">
                  <h5 className="text-sm font-medium text-white mb-1 line-clamp-2">
                    {rec.title}
                  </h5>
                  <div className="text-xs text-gray-400">
                    {rec.authors?.map(a => a.name).join(', ')}
                    {rec.year && ` · ${rec.year}`}
                    {rec.citationCount && ` · ${rec.citationCount} 引用`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 引用上下文 */}
        {citationContexts.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-white mb-3">引用上下文</h4>
            <div className="space-y-3">
              {citationContexts.slice(0, 3).map((context, index) => (
                <div key={index} className="bg-gray-700 rounded p-3">
                  <div className="text-sm text-white mb-2">
                    {context.citingPaper.title}
                  </div>
                  {context.contexts && context.contexts.length > 0 && (
                    <div className="text-xs text-gray-300 italic">
                      "{context.contexts[0]}"
                    </div>
                  )}
                  {context.isInfluential && (
                    <div className="mt-2">
                      <span className="px-2 py-1 bg-yellow-600 bg-opacity-20 text-yellow-300 text-xs rounded">
                        重要引用
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DetailsPanel

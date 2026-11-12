import React, { useMemo, useState } from 'react'
import { useUiStore } from '../../store/useUiStore'
import { colorFor, EDGE_COLORS } from '../../graph/encoding'
import { summarizeClusters } from '../../graph/clusterSummary'
import type { GraphNode } from '../../graph/graphAdapter'
import type { EdgeType } from '../../types/domain'

interface Props {
  nodes: GraphNode[]
  rootNode?: GraphNode | null
  onSelectRoot?: () => void
  /** Edge type currently previewed by the graph, if any. */
  activeEdgeType?: EdgeType | null
  /** The active type exists but has no link at the root paper. */
  focusEmpty?: boolean
  /** Starts (type) or clears (null) the dwell-to-focus preview. */
  onEdgeTypeHover?: (type: EdgeType | null) => void
  /** Community currently highlighted, either hovered or pinned. */
  activeClusterId?: number | null
  /** Community pinned by a click; stays lit after the pointer leaves. */
  pinnedClusterId?: number | null
  /** Previews (id) or clears (null) one community while hovering its row. */
  onClusterHover?: (id: number | null) => void
  /** Pins a community, or clears it when the same row is clicked again. */
  onClusterSelect?: (id: number | null) => void
}

const EDGE_LEGEND: { type: EdgeType; label: string }[] = [
  { type: 'citation', label: '后续工作（引用）' },
  { type: 'reference', label: '前置工作（参考）' },
  { type: 'related', label: '相关（推荐）' },
  { type: 'coupling', label: '文献耦合' },
  { type: 'semantic', label: '语义相近' },
]

const MAX_CLUSTER_ROWS = 8

function yearLabel(range: [number, number] | null): string | null {
  if (!range) return null
  return range[0] === range[1] ? `${range[0]}` : `${range[0]}–${range[1]}`
}

const GraphLegend: React.FC<Props> = ({
  nodes,
  rootNode,
  onSelectRoot,
  activeEdgeType = null,
  focusEmpty = false,
  onEdgeTypeHover,
  activeClusterId = null,
  pinnedClusterId = null,
  onClusterHover,
  onClusterSelect,
}) => {
  const { colorMode, hiddenEdgeTypes, toggleEdgeType } = useUiStore()
  const [hoverClusterId, setHoverClusterId] = useState<number | null>(null)

  const clusters = useMemo(() => summarizeClusters(nodes), [nodes])
  const meaningful = clusters.filter((c) => c.size > 1)
  const shownClusters = meaningful.slice(0, MAX_CLUSTER_ROWS)
  const hiddenClusters = meaningful.length - shownClusters.length
  const singletonCount = clusters
    .filter((c) => c.size === 1)
    .reduce((sum, c) => sum + c.size, 0)
  const detailCluster =
    clusters.find((c) => c.id === (hoverClusterId ?? activeClusterId)) ?? null

  let entries: { key: string; label: string; color: string }[] = []
  if (colorMode === 'cluster') {
    entries = []
  } else if (colorMode === 'field') {
    const seen = new Map<string, string>()
    for (const n of nodes) {
      const f = n.fieldsOfStudy?.[0]
      if (f && !seen.has(f)) seen.set(f, colorFor(n, 'field'))
    }
    entries = [...seen.entries()].map(([f, color]) => ({ key: f, label: f, color }))
  }

  const enterCluster = (id: number) => {
    setHoverClusterId(id)
    onClusterHover?.(id)
  }
  const leaveCluster = () => {
    setHoverClusterId(null)
    onClusterHover?.(null)
  }

  return (
    <div className="absolute bottom-4 right-4 z-10 max-h-[calc(100%-2rem)] max-w-[264px] overflow-y-auto rounded-lg bg-gray-800/90 p-3 text-xs text-white">
      {colorMode === 'year' ? (
        <div>
          <div className="mb-1 text-gray-300">年份</div>
          <div
            className="h-2 w-40 rounded"
            style={{ background: 'linear-gradient(to right, hsl(220,70%,55%), hsl(0,70%,55%))' }}
          />
        </div>
      ) : colorMode === 'cluster' ? (
        <div>
          <div className="mb-1 text-gray-300">聚类</div>
          {clusters.length <= 1 ? (
            <div className="max-w-[190px] text-[10px] leading-snug text-gray-400">
              {nodes.length > 1
                ? '论文间引用关系较稀疏，未形成明显的主题分区'
                : '当前视图论文不足，暂无可分区的主题'}
            </div>
          ) : (
            <>
              <div className="space-y-0.5">
                {shownClusters.map((c) => {
                  const pinned = pinnedClusterId === c.id
                  const hinted = hoverClusterId === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={pinned}
                      onClick={() => onClusterSelect?.(pinned ? null : c.id)}
                      onMouseEnter={() => enterCluster(c.id)}
                      onMouseLeave={leaveCluster}
                      onFocus={() => enterCluster(c.id)}
                      onBlur={leaveCluster}
                      title={`${c.label} · ${c.size} 篇`}
                      className={`-mx-1 flex w-full items-center gap-2 rounded px-1 text-left transition-colors hover:text-white ${
                        pinned ? 'bg-gray-700/70' : hinted ? 'bg-gray-700/40' : ''
                      }`}
                    >
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ background: c.color }}
                      />
                      <span className="line-clamp-2 leading-tight">{c.label}</span>
                      <span className="ml-auto shrink-0 tabular-nums text-[10px] text-gray-400">
                        {c.size}
                      </span>
                    </button>
                  )
                })}
              </div>
              {(hiddenClusters > 0 || singletonCount > 0) && (
                <div className="mt-1 text-[10px] leading-snug text-gray-500">
                  {hiddenClusters > 0 && <div>另有 {hiddenClusters} 个较小主题</div>}
                  {singletonCount > 0 && <div>{singletonCount} 篇论文关系零散，未归入主题</div>}
                </div>
              )}
              <div className="mt-1 text-[10px] text-gray-500">悬停预览 · 点击固定主题</div>
            </>
          )}
          {detailCluster && clusters.length > 1 && (
            // A popover, not an in-flow block: growing the legend on hover would
            // move the hovered row out from under the pointer and flicker.
            <div className="pointer-events-none absolute bottom-[calc(100%+8px)] right-0 w-64 rounded bg-gray-900/95 p-2 text-[10px] leading-relaxed shadow-lg">
              <div className="font-medium text-gray-200">{detailCluster.label}</div>
              <div className="text-gray-400">
                {detailCluster.size} 篇 · {Math.round(detailCluster.share * 100)}%
                {yearLabel(detailCluster.yearRange) && ` · ${yearLabel(detailCluster.yearRange)}`}
              </div>
              {detailCluster.topField && (
                <div className="text-gray-500">主要领域：{detailCluster.topField}</div>
              )}
              {detailCluster.topPapers.length > 0 && (
                <>
                  <div className="mt-1 text-gray-500">代表论文</div>
                  {detailCluster.topPapers.map((p) => (
                    <div key={p.id} className="line-clamp-1 text-gray-300" title={p.title}>
                      · {p.title}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="mb-1 text-gray-300">学科领域</div>
          {entries.slice(0, 8).map((e) => (
            <div key={e.key} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: e.color }} />
              <span className="line-clamp-1">{e.label}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 space-y-1 border-t border-gray-600 pt-2 text-gray-300">
        <button
          type="button"
          onClick={onSelectRoot}
          disabled={!onSelectRoot}
          title={rootNode?.title || undefined}
          className="flex w-full items-center gap-2 text-left enabled:hover:text-white disabled:cursor-default"
        >
          <span className="h-3 w-3 rounded-full border-2 border-orange-500" />
          <span className="line-clamp-1">根论文</span>
        </button>
        <div className="mb-1 mt-1 text-[10px] text-gray-500">点击显示/隐藏 · 悬停 1 秒只看根节点相关</div>
        {EDGE_LEGEND.map((e) => {
          const hidden = hiddenEdgeTypes.includes(e.type)
          const active = activeEdgeType === e.type
          return (
            <button
              key={e.type}
              type="button"
              aria-pressed={!hidden}
              onClick={() => toggleEdgeType(e.type)}
              onMouseEnter={() => onEdgeTypeHover?.(e.type)}
              onMouseLeave={() => onEdgeTypeHover?.(null)}
              onFocus={() => onEdgeTypeHover?.(e.type)}
              onBlur={() => onEdgeTypeHover?.(null)}
              className={`-mx-1 flex w-full items-center gap-2 rounded px-1 text-left transition-colors hover:text-white ${
                active ? 'bg-gray-700/70 text-white' : ''
              } ${hidden ? 'opacity-40' : ''}`}
            >
              <span
                className="h-0.5 w-4"
                style={{ background: hidden ? '#4b5563' : EDGE_COLORS[e.type] }}
              />
              <span className={hidden ? 'line-through' : ''}>{e.label}</span>
              {active && (
                <span className="ml-auto text-[10px] text-gray-400">
                  {focusEmpty ? '根节点无此类边' : '仅看此类'}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default GraphLegend

import React, { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { GraphNode } from '../../graph/graphAdapter'

type SortKey = 'citations' | 'year' | 'title'

interface Props {
  nodes: GraphNode[]
  selectedId: string | null
  onSelect: (node: GraphNode) => void
  onReroot: (node: GraphNode) => void
  onClose: () => void
}

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'citations', label: '引用数' },
  { value: 'year', label: '年份' },
  { value: 'title', label: '标题' },
]

const GraphNodeList: React.FC<Props> = ({ nodes, selectedId, onSelect, onReroot, onClose }) => {
  const [sort, setSort] = useState<SortKey>('citations')

  const sorted = useMemo(() => {
    const copy = [...nodes]
    if (sort === 'citations') copy.sort((a, b) => b.citationCount - a.citationCount)
    else if (sort === 'year') copy.sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
    else copy.sort((a, b) => (a.title || a.label || a.id).localeCompare(b.title || b.label || b.id))
    return copy
  }, [nodes, sort])

  return (
    <div className="absolute right-0 top-0 z-30 flex h-full w-full flex-col border-l border-gray-700 bg-gray-800/95 text-xs text-white lg:w-80">
      <div className="flex items-center justify-between border-b border-gray-700 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">图节点</span>
          <span className="text-gray-400">{nodes.length} 篇</span>
        </div>
        <button
          type="button"
          aria-label="关闭节点列表"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded text-gray-400 hover:bg-gray-600 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-700 px-3 py-2 text-gray-400">
        <span>排序</span>
        <select
          aria-label="节点排序"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="min-h-11 rounded bg-gray-700 px-2 py-1 text-gray-100"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <p className="p-4 text-gray-400">当前没有可见节点</p>
        ) : (
          sorted.map((node) => (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelect(node)}
              onDoubleClick={() => onReroot(node)}
              title="单击选中并定位，双击以此为根重建网络"
              className={`block min-h-11 w-full border-b border-gray-700/60 px-3 py-2 text-left transition-colors hover:bg-gray-700 ${
                node.id === selectedId ? 'bg-gray-700/70' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ background: node.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-gray-100">{node.title || node.label || node.id}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-400">
                    {node.isRoot && <span className="text-orange-400">根论文</span>}
                    {node.year && <span>{node.year}</span>}
                    <span>{node.citationCount} 引用</span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export default GraphNodeList

import React, { useState } from 'react'
import { Search, Download, List } from 'lucide-react'
import { useUiStore } from '../../store/useUiStore'
import type { ColorMode, SizeMode } from '../../graph/encoding'

interface GraphToolbarProps {
  placement?: 'top-left' | 'bottom-left'
  nodeListOpen?: boolean
  onToggleNodeList?: () => void
  onExportPng?: () => void
  onExportJsonVisible?: () => void
  onExportJsonFull?: () => void
  onExportBibtex?: () => void
  onExportCsv?: () => void
}

const COLOR_MODES: { value: ColorMode; label: string }[] = [
  { value: 'cluster', label: '簇' },
  { value: 'year', label: '年份' },
  { value: 'field', label: '领域' },
]

const SIZE_MODES: { value: SizeMode; label: string }[] = [
  { value: 'citations', label: '引用数' },
  { value: 'pagerank', label: 'PageRank' },
]

const GraphToolbar: React.FC<GraphToolbarProps> = ({
  placement = 'top-left',
  nodeListOpen = false,
  onToggleNodeList,
  onExportPng,
  onExportJsonVisible,
  onExportJsonFull,
  onExportBibtex,
  onExportCsv,
}) => {
  const { graphView, setGraphView, colorMode, setColorMode, sizeMode, setSizeMode, graphQuery, setGraphQuery } =
    useUiStore()
  const [exportOpen, setExportOpen] = useState(false)
  const anchor = placement === 'bottom-left' ? 'bottom-4' : 'top-3 lg:top-4'

  const runExport = (handler?: () => void) => {
    handler?.()
    setExportOpen(false)
  }

  return (
    <div className={`absolute left-3 ${anchor} z-10 flex flex-col gap-2 rounded-lg bg-gray-800/90 p-2 text-xs text-white lg:left-4 lg:p-3`}>
      <div className="flex overflow-hidden rounded border border-gray-600">
        {(['2d', '3d'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setGraphView(v)}
            className={`min-h-11 min-w-11 px-3 py-2 ${
              graphView === v ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {v.toUpperCase()}
          </button>
        ))}
      </div>

      {onToggleNodeList && (
        <button
          type="button"
          aria-pressed={nodeListOpen}
          onClick={onToggleNodeList}
          className={`flex min-h-11 items-center justify-center gap-1 rounded px-2 py-2 ${
            nodeListOpen ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          <List className="h-3 w-3" />
          节点列表
        </button>
      )}

      <label className="hidden items-center gap-2 lg:flex">
        <span className="text-gray-400">配色</span>
        <select
          value={colorMode}
          onChange={(e) => setColorMode(e.target.value as ColorMode)}
          className="rounded bg-gray-700 px-1 py-0.5"
        >
          {COLOR_MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <label className="hidden items-center gap-2 lg:flex">
        <span className="text-gray-400">大小</span>
        <select
          value={sizeMode}
          onChange={(e) => setSizeMode(e.target.value as SizeMode)}
          className="rounded bg-gray-700 px-1 py-0.5"
        >
          {SIZE_MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <div className="hidden items-center gap-1 rounded bg-gray-700 px-2 py-1 lg:flex">
        <Search className="h-3 w-3 text-gray-400" />
        <input
          value={graphQuery}
          onChange={(e) => setGraphQuery(e.target.value)}
          placeholder="图内搜索"
          className="w-28 bg-transparent outline-none placeholder:text-gray-500"
        />
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setExportOpen((o) => !o)}
          className="flex min-h-11 w-full items-center justify-center gap-1 rounded bg-gray-700 px-2 py-2 hover:bg-gray-600"
        >
          <Download className="h-3 w-3 text-gray-400" />
          导出
        </button>
        {exportOpen && (
          <div
            className={`absolute left-0 z-20 flex w-40 flex-col overflow-hidden rounded border border-gray-600 bg-gray-800 ${
              placement === 'bottom-left' ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}
          >
            <button
              type="button"
              onClick={() => runExport(onExportPng)}
              className="min-h-11 px-3 py-2 text-left hover:bg-gray-700"
            >
              PNG（当前视图）
            </button>
            <button
              type="button"
              onClick={() => runExport(onExportJsonVisible)}
              className="min-h-11 px-3 py-2 text-left hover:bg-gray-700"
            >
              JSON（当前视图）
            </button>
            <button
              type="button"
              onClick={() => runExport(onExportJsonFull)}
              className="min-h-11 px-3 py-2 text-left hover:bg-gray-700"
            >
              JSON（完整网络）
            </button>
            <button
              type="button"
              onClick={() => runExport(onExportBibtex)}
              className="min-h-11 px-3 py-2 text-left hover:bg-gray-700"
            >
              BibTeX（当前视图）
            </button>
            <button
              type="button"
              onClick={() => runExport(onExportCsv)}
              className="min-h-11 px-3 py-2 text-left hover:bg-gray-700"
            >
              CSV（当前视图）
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default GraphToolbar

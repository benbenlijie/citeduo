import React from 'react'
import { ArrowLeftRight, Link2, Loader2 } from 'lucide-react'
import { useUiStore } from '../store/useUiStore'
import { useGraphSelection } from '../hooks/useGraphSelection'
import { resolvePaperKey } from '../lib/paperKey'
import type { Paper } from '../types/domain'

const truncate = (value: string, max = 16) => (value.length > max ? `${value.slice(0, max)}…` : value)

/**
 * Always-visible "which two papers am I analysing?" chip, replacing the old
 * context-free toggle. The pair is part of the state, so it should be readable
 * without opening the panel.
 */
const ConnectionCapsule: React.FC = () => {
  const selectedPaper = useUiStore((s) => s.selectedPaper)
  const comparePaper = useUiStore((s) => s.comparePaper)
  const connectionOpen = useUiStore((s) => s.connectionOpen)
  const connectionFrom = useUiStore((s) => s.connectionFrom)
  const connectionTo = useUiStore((s) => s.connectionTo)
  const connectionRequest = useUiStore((s) => s.connectionRequest)
  const connection = useUiStore((s) => s.connection)
  const setConnectionOpen = useUiStore((s) => s.setConnectionOpen)
  const connectPair = useUiStore((s) => s.connectPair)
  const { titleOf } = useGraphSelection()

  const fromId = resolvePaperKey(connectionFrom)
  const toId = resolvePaperKey(connectionTo)
  const hasPair = Boolean(fromId && toId)

  const name = (paper: Paper | null | undefined) => {
    if (!paper) return '未选'
    return truncate(paper.title || titleOf(resolvePaperKey(paper)) || resolvePaperKey(paper) || '未命名')
  }

  // Seeding on every open would silently discard the pair the user is reading,
  // so only seed when there is nothing to look at yet.
  const handleClick = () => {
    if (!hasPair && !connection) {
      connectPair(selectedPaper, comparePaper)
      return
    }
    setConnectionOpen(!connectionOpen)
  }

  const pending = Boolean(connectionRequest) && !connection
  const state = pending ? (
    <span className="flex items-center gap-1 text-gray-400">
      <Loader2 className="h-3 w-3 animate-spin" />
      检索中
    </span>
  ) : connection ? (
    connection.best ? (
      <span className="text-emerald-400">{connection.best.hopCount} 跳</span>
    ) : (
      <span className="text-amber-400">未找到</span>
    )
  ) : null

  return (
    <button
      type="button"
      aria-pressed={connectionOpen}
      onClick={handleClick}
      title={hasPair ? '查看这两篇论文的关联路径' : '选择两篇论文分析关联'}
      className={`flex min-h-11 items-center gap-2 rounded border px-2.5 py-1.5 text-sm transition-colors ${
        connectionOpen
          ? 'border-emerald-500 bg-emerald-600/20 text-emerald-300'
          : 'border-gray-600 text-gray-300 hover:border-emerald-500 hover:text-emerald-300'
      }`}
    >
      <Link2 className="h-3.5 w-3.5 shrink-0" />
      {hasPair ? (
        <>
          <span className="hidden items-center gap-1.5 sm:flex">
            <span className="max-w-[9rem] truncate" title={connectionFrom?.title || fromId || undefined}>
              {name(connectionFrom)}
            </span>
            <ArrowLeftRight className="h-3 w-3 shrink-0 text-gray-500" />
            <span className="max-w-[9rem] truncate" title={connectionTo?.title || toId || undefined}>
              {name(connectionTo)}
            </span>
          </span>
          <span className="sm:hidden">关联</span>
        </>
      ) : (
        <>
          <span className="hidden sm:inline">关联路径</span>
          <span className="sm:hidden">关联</span>
        </>
      )}
      {state}
    </button>
  )
}

export default ConnectionCapsule

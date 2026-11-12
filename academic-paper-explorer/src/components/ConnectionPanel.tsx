import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRightLeft,
  ChevronDown,
  Info,
  Loader2,
  Network,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useUiStore } from '../store/useUiStore'
import { api } from '../services/api'
import { usePaperConnection } from '../hooks/usePaperConnection'
import { useGraphSelection } from '../hooks/useGraphSelection'
import { resolvePaperKey } from '../lib/paperKey'
import type { ConnectionKind, ConnectionPath, NetworkNode, Paper, PaperConnection } from '../types/domain'

const KIND_LABEL: Record<ConnectionKind, string> = {
  same_paper: '同一篇论文',
  direct: '直接引用',
  citation_path: '引用链路',
  coupling: '文献耦合',
  co_citation: '共被引',
  semantic_bridge: '语义相似',
}

const KIND_STYLE: Record<ConnectionKind, string> = {
  same_paper: 'bg-gray-600/40 text-gray-200',
  direct: 'bg-emerald-500/20 text-emerald-300',
  citation_path: 'bg-sky-500/20 text-sky-300',
  coupling: 'bg-violet-500/20 text-violet-300',
  co_citation: 'bg-amber-500/20 text-amber-300',
  semantic_bridge: 'bg-pink-500/20 text-pink-300',
}

/** Papers in walk order, labelled by position so the chain is direction-neutral. */
function nodeTitle(node: NetworkNode | undefined, fallback: string): string {
  if (!node) return fallback
  return node.title || node.label || node.id
}

function paperLabel(paper: Paper | null, titleOf: (id: string | null | undefined) => string | null): string {
  if (!paper) return '未选择'
  const key = resolvePaperKey(paper)
  return paper.title || titleOf(key) || key || '未命名'
}

interface Candidate {
  label: string
  paper: Paper
}

/**
 * One half of the pair. The slot is deliberately writable: the read-only
 * version could only be cleared, so a missing compare paper left the user
 * staring at a disabled button with no way to say which paper they meant.
 */
const EndpointSlot: React.FC<{
  role: '起点' | '终点'
  paper: Paper | null
  candidates: Candidate[]
  titleOf: (id: string | null | undefined) => string | null
  onPick: (paper: Paper | null) => void
}> = ({ role, paper, candidates, titleOf, onPick }) => {
  const [open, setOpen] = useState(false)
  const currentKey = resolvePaperKey(paper)
  const options = useMemo(
    () => candidates.filter((c) => c.paper && resolvePaperKey(c.paper) !== currentKey),
    [candidates, currentKey],
  )
  const label = paperLabel(paper, titleOf)

  return (
    <div className="relative flex items-center gap-2 rounded border border-gray-700 bg-gray-900/60 px-2 py-1.5">
      <span className="shrink-0 rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-300">{role}</span>
      <button
        type="button"
        aria-label={`选择关联${role}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={label}
        className="min-w-0 flex-1 truncate text-left text-gray-200 hover:text-white"
      >
        {label}
      </button>
      <button
        type="button"
        aria-label={`展开${role}候选`}
        tabIndex={-1}
        onClick={() => setOpen((v) => !v)}
        className="shrink-0 rounded p-0.5 text-gray-500 hover:bg-gray-700 hover:text-white"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {paper && (
        <button
          type="button"
          aria-label={`清除${role}`}
          onClick={() => onPick(null)}
          className="shrink-0 rounded p-0.5 text-gray-500 hover:bg-gray-700 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded border border-gray-600 bg-gray-800 shadow-xl">
          {options.length === 0 ? (
            <p className="px-2 py-1.5 text-[11px] leading-relaxed text-gray-500">
              暂无可选论文：在左侧列表点「关联」，或在图上右键节点。
            </p>
          ) : (
            options.map((option) => (
              <button
                key={`${option.label}:${resolvePaperKey(option.paper)}`}
                type="button"
                onClick={() => {
                  onPick(option.paper)
                  setOpen(false)
                }}
                className="block w-full px-2 py-1.5 text-left hover:bg-gray-700"
              >
                <span className="text-[10px] text-gray-400">{option.label}</span>
                <span className="block truncate text-gray-100">{paperLabel(option.paper, titleOf)}</span>
              </button>
            ))
          )}
          {paper && (
            <button
              type="button"
              onClick={() => {
                onPick(null)
                setOpen(false)
              }}
              className="block w-full border-t border-gray-700 px-2 py-1.5 text-left text-gray-400 hover:bg-gray-700"
            >
              清除
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const Chain: React.FC<{ path: ConnectionPath; onPick: (id: string) => void }> = ({ path, onPick }) => {
  const byId = useMemo(() => new Map(path.nodes.map((n) => [n.id, n])), [path.nodes])
  return (
    <ol className="space-y-1">
      {path.nodeIds.map((id, i) => (
        <li key={`${id}-${i}`} className="flex items-start gap-2">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-semibold text-emerald-300">
            {i + 1}
          </span>
          <button
            type="button"
            onClick={() => onPick(id)}
            className="min-w-0 flex-1 truncate text-left text-sky-300 hover:text-sky-200 hover:underline"
            title={nodeTitle(byId.get(id), id)}
          >
            {nodeTitle(byId.get(id), id)}
          </button>
        </li>
      ))}
    </ol>
  )
}

const HopList: React.FC<{ path: ConnectionPath }> = ({ path }) => (
  <ul className="space-y-1 text-gray-400">
    {path.hops.map((hop, i) => (
      <li key={`${hop.from}-${hop.to}-${i}`} className="flex gap-1.5">
        <span className="text-gray-600">·</span>
        <span>{hop.text}</span>
      </li>
    ))}
  </ul>
)

/** Shared lineage / similarity hints — useful whether or not a path was found. */
const Signals: React.FC<{ connection: PaperConnection }> = ({ connection }) => {
  const { signals } = connection
  const empty =
    !signals.sharedReferences.length &&
    !signals.sharedCiters.length &&
    signals.semanticSimilarity === null &&
    !signals.sharedFields.length &&
    !signals.sharedAuthors.length
  if (empty) return null
  return (
    <div className="space-y-1.5 rounded border border-gray-700 bg-gray-900/40 px-2 py-1.5">
      <p className="text-gray-400">其他关联信号</p>
      {signals.sharedReferences.length > 0 && (
        <p className="text-gray-300">共同引用 {signals.sharedReferences.length} 篇文献</p>
      )}
      {signals.sharedCiters.length > 0 && (
        <p className="text-gray-300">共同被 {signals.sharedCiters.length} 篇文献引用</p>
      )}
      {signals.semanticSimilarity !== null && (
        <p className="text-gray-300">语义相似度 {signals.semanticSimilarity.toFixed(3)}</p>
      )}
      {signals.sharedFields.length > 0 && (
        <p className="text-gray-300">共同领域：{signals.sharedFields.join('、')}</p>
      )}
      {signals.sharedAuthors.length > 0 && (
        <p className="text-gray-300">共同作者：{signals.sharedAuthors.join('、')}</p>
      )}
    </div>
  )
}

const ConnectionPanel: React.FC = () => {
  const {
    selectedPaper,
    comparePaper,
    connectionOpen,
    connectionFrom,
    connectionTo,
    connectionRequest,
    connection,
    setConnectionOpen,
    setConnectionFrom,
    setConnectionTo,
    requestConnection,
    setConnection,
    clearConnection,
    clearConnectionPair,
    setSelectedNodeId,
  } = useUiStore()

  const { selected: graphSelected, titleOf } = useGraphSelection()

  // `null` means "follow the server": the toggle only overrides once the user
  // touches it, and stays disabled when the operator turned upstream off
  // (CONNECT_LOCAL_ONLY=1).
  const [allowUpstream, setAllowUpstream] = useState<boolean | null>(null)
  const [serverLocalOnly, setServerLocalOnly] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .getConfig()
      .then((c) => !cancelled && setServerLocalOnly(c.connectLocalOnly))
      .catch(() => !cancelled && setServerLocalOnly(null))
    return () => {
      cancelled = true
    }
  }, [])

  const live = allowUpstream ?? (serverLocalOnly === null ? undefined : !serverLocalOnly)

  const query = usePaperConnection(
    connectionRequest?.fromId ?? null,
    connectionRequest?.toId ?? null,
    Boolean(connectionRequest),
    live,
  )

  // React Query only hands back data for the *current* key, so a stale answer
  // can never be written for freshly changed endpoints.
  useEffect(() => {
    if (query.data) setConnection(query.data)
  }, [query.data, setConnection])

  const candidates = useMemo<Candidate[]>(() => {
    const all: (Candidate | null)[] = [
      selectedPaper ? { label: '当前论文', paper: selectedPaper } : null,
      comparePaper ? { label: '对比论文', paper: comparePaper } : null,
      graphSelected ? { label: '图上选中的节点', paper: graphSelected } : null,
    ]
    const seen = new Set<string>()
    const out: Candidate[] = []
    for (const c of all) {
      if (!c) continue
      const key = resolvePaperKey(c.paper)
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(c)
    }
    return out
  }, [selectedPaper, comparePaper, graphSelected])

  if (!connectionOpen) return null

  const fromId = resolvePaperKey(connectionFrom)
  const toId = resolvePaperKey(connectionTo)
  const runnable = Boolean(fromId && toId && fromId !== toId)
  const loading = query.isFetching

  const swap = () => {
    setConnectionFrom(connectionTo)
    setConnectionTo(connectionFrom)
    clearConnection()
  }

  return (
    <div className="absolute right-4 top-16 z-30 flex max-h-[70%] w-[22rem] flex-col overflow-hidden rounded-lg border border-gray-700 bg-gray-800/95 text-xs text-white shadow-xl">
      <div className="flex items-center justify-between border-b border-gray-700 px-3 py-2">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-semibold">论文关联路径</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="交换起点终点"
            onClick={swap}
            disabled={!connectionFrom && !connectionTo}
            className="rounded p-1 text-gray-400 hover:bg-gray-600 hover:text-white disabled:opacity-40"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="清除关联"
            title="清除这两篇论文与检索结果"
            onClick={clearConnectionPair}
            disabled={!fromId && !toId && !connection}
            className="rounded p-1 text-gray-400 hover:bg-gray-600 hover:text-white disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="关闭关联路径面板"
            onClick={() => setConnectionOpen(false)}
            className="rounded p-1 text-gray-400 hover:bg-gray-600 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2 border-b border-gray-700 px-3 py-2">
        <EndpointSlot
          role="起点"
          paper={connectionFrom}
          candidates={candidates}
          titleOf={titleOf}
          onPick={setConnectionFrom}
        />
        <EndpointSlot
          role="终点"
          paper={connectionTo}
          candidates={candidates}
          titleOf={titleOf}
          onPick={setConnectionTo}
        />
        <p className="text-[11px] leading-relaxed text-gray-500">
          点槽位可从「当前论文 / 对比论文 / 图上选中的节点」里挑，也可以在图上右键任意节点直接设为起点或终点。
        </p>
        <button
          type="button"
          onClick={() => fromId && toId && requestConnection(fromId, toId)}
          disabled={!runnable || loading}
          className="flex w-full items-center justify-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          {loading ? '正在检索关联…' : '查找关联路径'}
        </button>
        {fromId && toId && fromId === toId && (
          <p className="text-[11px] text-amber-400">起点与终点是同一篇论文，请选择两篇不同的论文。</p>
        )}
        {serverLocalOnly === true ? (
          <p className="text-[11px] text-gray-500">本实例已关闭联网扩展（CONNECT_LOCAL_ONLY=1），只在本地缓存中检索。</p>
        ) : (
          <label className="flex items-start gap-2 text-[11px] leading-relaxed text-gray-400">
            <input
              type="checkbox"
              className="mt-0.5 accent-emerald-500"
              checked={live ?? false}
              disabled={serverLocalOnly === null}
              onChange={(e) => setAllowUpstream(e.target.checked)}
            />
            <span>
              允许联网扩展
              <span className="text-gray-500">
                ：本地找不到链路时，实时查询 Semantic Scholar。关闭后只用本地缓存，更快，但可能漏掉新论文。
              </span>
            </span>
          </label>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-2">
        {loading && (
          <p className="text-gray-500">
            正在从本地缓存与 Semantic Scholar 双向检索，必要时会联网扩展，最长约 25 秒。
          </p>
        )}

        {!loading && query.error && (
          <p className="text-rose-400">{query.error instanceof Error ? query.error.message : '关联检索失败'}</p>
        )}

        {!loading && connection && !connection.best && (
          <div className="space-y-2">
            <p className="flex items-start gap-1.5 text-gray-300">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
              <span>没有找到引用链路、共同引用或语义关联。</span>
            </p>
            {connection.stats.upstreamUnavailable && (
              <p className="flex items-start gap-1.5 text-amber-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>上游检索暂时不可用，本次结论只基于本地缓存，稍后可重试。</span>
              </p>
            )}
            <Signals connection={connection} />
          </div>
        )}

        {!loading && connection?.best && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded px-1.5 py-0.5 font-medium ${KIND_STYLE[connection.best.kind]}`}>
                {KIND_LABEL[connection.best.kind]}
              </span>
              <span className="text-gray-500">
                {connection.best.hopCount} 跳 · {connection.stats.source === 'live' ? '含联网扩展' : '来自本地缓存'}
              </span>
              {connection.stats.upstreamUnavailable && (
                <span className="flex items-center gap-1 text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  上游不可用
                </span>
              )}
            </div>
            <p className="text-gray-200">{connection.best.summary}</p>
            <Chain path={connection.best} onPick={setSelectedNodeId} />
            <HopList path={connection.best} />

            {connection.alternatives.length > 0 && (
              <details className="rounded border border-gray-700 bg-gray-900/40 px-2 py-1.5">
                <summary className="cursor-pointer text-gray-400">
                  其他 {connection.alternatives.length} 条路径
                </summary>
                <div className="mt-2 space-y-2">
                  {connection.alternatives.map((alt, i) => (
                    <div key={`${alt.kind}-${i}`} className="space-y-1 border-t border-gray-700/60 pt-2">
                      <span className={`rounded px-1.5 py-0.5 font-medium ${KIND_STYLE[alt.kind]}`}>
                        {KIND_LABEL[alt.kind]}
                      </span>
                      <p className="text-gray-300">{alt.summary}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <Signals connection={connection} />
          </div>
        )}
      </div>
    </div>
  )
}

export default ConnectionPanel

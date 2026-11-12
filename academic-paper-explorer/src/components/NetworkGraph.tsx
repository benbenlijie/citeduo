import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { forceCollide } from 'd3-force'
import { Loader2 } from 'lucide-react'
import { useUiStore } from '../store/useUiStore'
import { usePaperNetwork, networkCacheKeyForPaper } from '../hooks/usePaperNetwork'
import { api } from '../services/api'
import { mergeNetworkData } from '../lib/graphMerge'
import { filterGraph } from '../graph/graphFilters'
import { graphAdapter, linkEndId, nodeToPaper, type GraphLink, type GraphNode } from '../graph/graphAdapter'
import { pickVisibleLabels, ZOOM_LABEL_THRESHOLD } from '../graph/labelLod'
import { connectionHighlight, ensurePathVisible } from '../graph/connectionPath'
import { focusSetsForEdgeType } from '../graph/edgeTypeFocus'
import { useEdgeTypeFocus } from '../hooks/useEdgeTypeFocus'

import { EDGE_COLORS, isDirectedEdge, linkWidthFor, withAlpha } from '../graph/encoding'
import { buildExportPayload, downloadCanvasPng, downloadText, exportFilename, toBibtex, toCsv } from '../graph/exportGraph'
import {
  applyPositions,
  collectPositions,
  readNetworkPositions,
  writeNetworkPositions,
} from '../lib/networkCache'
import { annotatedIds } from '../lib/notes'
import { useNotesStore } from '../store/useNotesStore'
import GraphToolbar from './graph/GraphToolbar'
import NodeContextMenu, { type NodeMenuItem } from './graph/NodeContextMenu'
import GraphLegend from './graph/GraphLegend'
import GraphTimeline from './graph/GraphTimeline'
import GraphMinimap from './graph/GraphMinimap'
import GraphTooltip from './graph/GraphTooltip'
import GraphNodeList from './graph/GraphNodeList'
import type { Paper, NetworkData, NetworkEdge, NetworkNode } from '../types/domain'

const ForceGraph3D = React.lazy(() => import('../graph/ForceGraph3DLazy'))

interface LabelRect {
  x: number
  y: number
  w: number
  h: number
}

function paintRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  if (typeof (ctx as any).roundRect === 'function') {
    ;(ctx as any).roundRect(x, y, w, h, r)
  } else {
    ctx.rect(x, y, w, h)
  }
}

interface NetworkGraphProps {
  paper?: Paper | null
  slot?: 'primary' | 'compare'
}

// Fit the 3D camera to the node positions only (the library's zoomToFit also
// measures the label sprites, which makes the graph look tiny). Fits each axis
// against the matching FOV so wide-but-flat graphs still fill the viewport.
function fitCamera3D(fg: any, nodes: GraphNode[], duration = 600) {
  if (!fg?.cameraPosition) return
  const pts = nodes.filter((n) => typeof n.x === 'number' && typeof n.y === 'number')
  if (pts.length === 0) return
  const min = (sel: (n: GraphNode) => number) => Math.min(...pts.map(sel))
  const max = (sel: (n: GraphNode) => number) => Math.max(...pts.map(sel))
  const minX = min((n) => n.x as number)
  const maxX = max((n) => n.x as number)
  const minY = min((n) => n.y as number)
  const maxY = max((n) => n.y as number)
  const minZ = min((n) => n.z ?? 0)
  const maxZ = max((n) => n.z ?? 0)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const cz = (minZ + maxZ) / 2
  const hx = (maxX - minX) / 2
  const hy = (maxY - minY) / 2
  const hz = (maxZ - minZ) / 2
  const cam = fg.camera?.()
  const fov = ((cam?.fov ?? 50) * Math.PI) / 180
  const aspect = cam?.aspect || 1
  const tan = Math.tan(fov / 2)
  const dist = Math.max(hy, hz, hx / aspect, 1) / tan * 1.15 + 16
  fg.cameraPosition({ x: cx, y: cy, z: cz + dist }, { x: cx, y: cy, z: cz }, duration)
}

interface Graph3DBoundaryProps {
  resetKey: string
  children: React.ReactNode
}

class Graph3DErrorBoundary extends React.Component<Graph3DBoundaryProps, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidUpdate(prev: Graph3DBoundaryProps) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center bg-gray-900">
          <div className="max-w-sm text-center">
            <p className="text-red-400">3D 视图渲染失败</p>
            <p className="mt-2 break-words text-sm text-gray-400">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              重试
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({ paper, slot = 'primary' }) => {
  const {
    selectedPaper,
    selectedNodeId,
    setSelectedNodeId,
    selectRootPaper,
    compareSelectedNodeId,
    setCompareSelectedNodeId,
    comparePaper,
    setComparePaper,
    connection,
    connectionFrom,
    connectionTo,
    setConnectionFrom,
    setConnectionTo,
    setConnectionOpen,
    clearConnection,
    clearConnectionPair,
    submitQuery,
    filters,
    graphView,
    colorMode,
    sizeMode,
    timelineYear,
    setTimelineYear,
    setTimelinePlaying,
    graphQuery,
    graphDepth,
    graphMaxNodes,
    hiddenEdgeTypes,
    expandedNodeIds,
    compareExpandedNodeIds,
    addExpandedNode,
    setExpandedNodeIds,
    addCompareExpandedNode,
    setCompareExpandedNodeIds,
  } = useUiStore()

  const isCompare = slot === 'compare'
  const rootPaper = paper !== undefined ? paper : selectedPaper
  const activeSelectionId = isCompare ? compareSelectedNodeId : selectedNodeId
  const expandedIds = isCompare ? compareExpandedNodeIds : expandedNodeIds
  const addExpandedId = isCompare ? addCompareExpandedNode : addExpandedNode
  const clearExpandedIds = isCompare ? setCompareExpandedNodeIds : setExpandedNodeIds

  // A connection belongs to the *pair*, so it is drawn once in the primary pane
  // rather than duplicated across the compare split.
  const connectionPath = isCompare ? null : (connection?.best ?? null)
  const pathActive = Boolean(connectionPath)
  const { nodeIds: pathNodeIds, linkKeys: pathLinkKeys } = useMemo(
    () => connectionHighlight(connectionPath),
    [connectionPath],
  )

  const selectNode = useCallback(
    (id: string | null) => {
      if (isCompare) {
        setCompareSelectedNodeId(id)
        if (id !== null) setSelectedNodeId(null)
      } else {
        setSelectedNodeId(id)
        if (id !== null) setCompareSelectedNodeId(null)
      }
    },
    [isCompare, setCompareSelectedNodeId, setSelectedNodeId],
  )

  const focusNode = useCallback(
    (node: GraphNode, duration = 700) => {
      const x = node.x ?? 0
      const y = node.y ?? 0
      const z = node.z ?? 0
      if (graphView === '3d') {
        const dist = 160
        const hyp = Math.hypot(x, y, z) || 1
        const ratio = 1 + dist / hyp
        fg3dRef.current?.cameraPosition({ x: x * ratio, y: y * ratio, z: z * ratio || dist }, { x, y, z }, duration)
      } else {
        fg2dRef.current?.centerAt(x, y, duration)
        fg2dRef.current?.zoom(2.2, duration)
      }
    },
    [graphView],
  )

  const { data: networkData, isLoading, error } = usePaperNetwork(rootPaper, graphDepth ?? undefined, graphMaxNodes ?? undefined)

  const notes = useNotesStore((s) => s.notes)
  const markedIds = useMemo(() => annotatedIds(notes), [notes])

  const roRef = useRef<ResizeObserver | null>(null)
  const containerElRef = useRef<HTMLDivElement | null>(null)
  const fg2dRef = useRef<any>(null)
  const fg3dRef = useRef<any>(null)
  const lastClick = useRef<{ id: string; t: number } | null>(null)
  const labelRectsRef = useRef<LabelRect[]>([])
  const fittedRef = useRef<unknown>(null)

  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)
  const [engineTick, setEngineTick] = useState(0)
  const [menu, setMenu] = useState<{ x: number; y: number; node: GraphNode } | null>(null)
  const [extra, setExtra] = useState<{ nodes: NetworkNode[]; edges: NetworkEdge[] }>({ nodes: [], edges: [] })
  const [expandingId, setExpandingId] = useState<string | null>(null)
  const [nodeListOpen, setNodeListOpen] = useState(false)
  // Community highlight is local to this graph: hovering a legend row previews
  // it, clicking pins it, and moving to another network or colour mode clears it.
  const [clusterHover, setClusterHover] = useState<number | null>(null)
  const [clusterFocus, setClusterFocus] = useState<number | null>(null)
  const rootSelectedFor = useRef<string | null>(null)
  const expandedFetchedFor = useRef<Set<string>>(new Set())

  // A deliberate legend hover previews one edge type; it is transient and never
  // touches the hidden-type filter, so leaving the entry restores the graph.
  const {
    activeType: focusedEdgeType,
    hoverEdgeType,
    clearFocus: clearEdgeTypeFocus,
  } = useEdgeTypeFocus()

  const setContainer = useCallback((el: HTMLDivElement | null) => {
    containerElRef.current = el
    roRef.current?.disconnect()
    roRef.current = null
    if (!el) return
    const measure = () => setDimensions({ width: el.clientWidth, height: el.clientHeight })
    measure()
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure)
      ro.observe(el)
      roRef.current = ro
    }
  }, [])

  useEffect(() => () => roRef.current?.disconnect(), [])

  const connectionExtra = useMemo<NetworkData>(
    () => (connectionPath ? { nodes: connectionPath.nodes, edges: connectionPath.edges } : { nodes: [], edges: [] }),
    [connectionPath],
  )

  const combined = useMemo(
    () => mergeNetworkData(mergeNetworkData(networkData ?? { nodes: [], edges: [] }, extra), connectionExtra),
    [networkData, extra, connectionExtra],
  )

  const { nodes: filteredNodes, edges: filteredEdges } = useMemo(() => {
    const { nodes, edges } = filterGraph(combined.nodes, combined.edges, {
      yearRange: filters.yearRange,
      minCitations: filters.minCitations,
      selectedFields: filters.selectedFields,
      selectedVenues: filters.selectedVenues,
      timelineYear,
    })
    const keptEdges = edges.filter((e) => !hiddenEdgeTypes.includes(e.type))
    return ensurePathVisible(nodes, keptEdges, connectionPath)
  }, [combined, filters, timelineYear, hiddenEdgeTypes, connectionPath])

  // Year domain for the timeline slider: everything except the timeline filter,
  // otherwise the slider range collapses while dragging (feedback loop).
  const domainNodes = useMemo(() => {
    return filterGraph(combined.nodes, [], {
      yearRange: filters.yearRange,
      minCitations: filters.minCitations,
      selectedFields: filters.selectedFields,
      selectedVenues: filters.selectedVenues,
      timelineYear: null,
    }).nodes
  }, [combined, filters])

  // A new network invalidates any year filter carried over from the old paper.
  useEffect(() => {
    setTimelineYear(null)
    setTimelinePlaying(false)
  }, [networkData, setTimelineYear, setTimelinePlaying])

  const cacheKey = networkCacheKeyForPaper(rootPaper, graphDepth ?? undefined, graphMaxNodes ?? undefined)
  const prevCacheKey = useRef<string | null>(null)

  const fetchExpansion = useCallback(async (id: string) => {
    if (expandedFetchedFor.current.has(id)) return
    expandedFetchedFor.current.add(id)
    try {
      const data = await api.networkWithPolling(id, 1, 50)
      setExtra((prev) => mergeNetworkData(prev, data))
    } catch {
      expandedFetchedFor.current.delete(id)
    }
  }, [])

  // A different graph drops expansions; the first build must not wipe URL-restored ids.
  useEffect(() => {
    const prev = prevCacheKey.current
    prevCacheKey.current = cacheKey
    if (prev !== null && prev !== cacheKey) {
      setExtra({ nodes: [], edges: [] })
      expandedFetchedFor.current = new Set()
      clearExpandedIds([])
    }
  }, [cacheKey, clearExpandedIds])

  // Re-fetch expansions carried by the URL so a shared link restores them.
  useEffect(() => {
    if (!networkData) return
    for (const id of expandedIds) void fetchExpansion(id)
  }, [networkData, expandedIds, fetchExpansion])

  const expandNode = useCallback(
    async (node: GraphNode) => {
      setExpandingId(node.id)
      addExpandedId(node.id)
      try {
        await fetchExpansion(node.id)
      } finally {
        setExpandingId(null)
      }
    },
    [addExpandedId, fetchExpansion],
  )

  const graphData = useMemo(() => {
    const data = graphAdapter(filteredNodes, filteredEdges, { colorMode, sizeMode })
    applyPositions(data.nodes, cacheKey ? readNetworkPositions(cacheKey) : undefined)
    return data
  }, [filteredNodes, filteredEdges, colorMode, sizeMode, cacheKey])

  const rootNode = useMemo(() => graphData.nodes.find((n) => n.isRoot) ?? null, [graphData])

  const clusterById = useMemo(
    () => new Map(graphData.nodes.map((n) => [n.id, n.clusterId])),
    [graphData],
  )
  const clusterIdSet = useMemo(
    () => new Set(graphData.nodes.map((n) => n.clusterId)),
    [graphData],
  )
  // A hovered or pinned community only applies while it is still in this view.
  const hoveredCluster =
    clusterHover !== null && clusterIdSet.has(clusterHover) ? clusterHover : null
  const pinnedCluster =
    clusterFocus !== null && clusterIdSet.has(clusterFocus) ? clusterFocus : null
  const activeClusterId = colorMode === 'cluster' ? (hoveredCluster ?? pinnedCluster) : null

  useEffect(() => {
    setClusterHover(null)
    setClusterFocus(null)
  }, [cacheKey, colorMode])

  // Nothing to preview when the type has no visible links at the root.
  const edgeFocus = useMemo(
    () => focusSetsForEdgeType(graphData.links, focusedEdgeType, rootNode?.id ?? null),
    [graphData, focusedEdgeType, rootNode],
  )
  const edgeFocusActive =
    focusedEdgeType !== null && graphData.links.some((l) => l.type === focusedEdgeType)

  // Cap preview labels so a type with hundreds of links stays readable and
  // cheap to paint; larger nodes carry the names.
  const edgeFocusLabelIds = useMemo(() => {
    const ids = new Set<string>()
    if (!edgeFocusActive) return ids
    const ranked = graphData.nodes
      .filter((n) => edgeFocus.nodeIds.has(n.id))
      .sort((a, b) => b.size - a.size)
    for (const n of ranked.slice(0, 24)) ids.add(n.id)
    const root = graphData.nodes.find((n) => n.isRoot)
    if (root) ids.add(root.id)
    return ids
  }, [edgeFocus, edgeFocusActive, graphData])

  // Hiding the previewed type, or moving to another network, ends the preview.
  useEffect(() => {
    if (focusedEdgeType && hiddenEdgeTypes.includes(focusedEdgeType)) clearEdgeTypeFocus()
  }, [focusedEdgeType, hiddenEdgeTypes, clearEdgeTypeFocus])

  useEffect(() => {
    clearEdgeTypeFocus()
  }, [networkData, clearEdgeTypeFocus])

  const positionsSavedAt = useRef(0)

  // Select the root node once each time a new graph is generated (primary pane).
  useEffect(() => {
    if (isCompare || !cacheKey || graphData.nodes.length === 0) return
    if (rootSelectedFor.current === cacheKey) return
    rootSelectedFor.current = cacheKey
    if (activeSelectionId && graphData.nodes.some((n) => n.id === activeSelectionId)) return
    const root = graphData.nodes.find((n) => n.isRoot)
    if (root) selectNode(root.id)
  }, [isCompare, cacheKey, graphData, activeSelectionId, selectNode])

  const rootTitle = rootPaper?.title || undefined

  const handleSelectRoot = useCallback(() => {
    if (!rootNode) return
    selectNode(rootNode.id)
    focusNode(rootNode)
  }, [rootNode, selectNode, focusNode])

  const handleNodeListSelect = useCallback(
    (node: GraphNode) => {
      selectNode(node.id)
      focusNode(node)
    },
    [selectNode, focusNode],
  )

  const handleExportPng = useCallback(() => {
    const canvas = containerElRef.current?.querySelector('canvas') as HTMLCanvasElement | null
    if (!canvas) return
    downloadCanvasPng(canvas, exportFilename(rootTitle, 'png'))
  }, [rootTitle])

  const handleExportJsonVisible = useCallback(() => {
    const payload = buildExportPayload(filteredNodes, filteredEdges, { scope: 'visible', rootTitle })
    downloadText(exportFilename(rootTitle, 'json'), JSON.stringify(payload, null, 2), 'application/json')
  }, [filteredNodes, filteredEdges, rootTitle])

  const handleExportJsonFull = useCallback(() => {
    if (!networkData) return
    const payload = buildExportPayload(networkData.nodes, networkData.edges, { scope: 'full', rootTitle })
    downloadText(exportFilename(rootTitle, 'json'), JSON.stringify(payload, null, 2), 'application/json')
  }, [networkData, rootTitle])

  const handleExportBibtex = useCallback(() => {
    downloadText(exportFilename(rootTitle, 'bib'), toBibtex(filteredNodes), 'application/x-bibtex')
  }, [filteredNodes, rootTitle])

  const handleExportCsv = useCallback(() => {
    downloadText(exportFilename(rootTitle, 'csv'), toCsv(filteredNodes), 'text/csv')
  }, [filteredNodes, rootTitle])

  const activeId = hoverNode?.id ?? activeSelectionId ?? null

  const { neighborIds, linkKeys } = useMemo(() => {
    const nIds = new Set<string>()
    const lKeys = new Set<string>()
    if (!activeId) return { neighborIds: nIds, linkKeys: lKeys }
    nIds.add(activeId)
    for (const link of graphData.links) {
      const s = linkEndId(link.source)
      const t = linkEndId(link.target)
      if (s === activeId || t === activeId) {
        nIds.add(s)
        nIds.add(t)
        lKeys.add(`${s}->${t}`)
      }
    }
    return { neighborIds: nIds, linkKeys: lKeys }
  }, [activeId, graphData])

  // Everything that must stay lit: the hovered node's neighbours plus the
  // connection path. Labels and dimming both key off this set.
  const highlightIds = useMemo(() => {
    const ids = new Set(neighborIds)
    for (const id of pathNodeIds) ids.add(id)
    return ids
  }, [neighborIds, pathNodeIds])

  const priorityLabelIds = useMemo(
    () => pickVisibleLabels(graphData.nodes, { activeId, neighborIds: highlightIds, globalScale: 0, limit: 0 }),
    [graphData, activeId, highlightIds],
  )

  const zoomLabelIds = useMemo(
    () => pickVisibleLabels(graphData.nodes, { activeId, neighborIds: highlightIds, globalScale: 2, limit: 12 }),
    [graphData, activeId, highlightIds],
  )

  // 3D labels: base on selection only (not hover) so hovering does not rebuild
  // the whole three.js node object set every frame.
  const selectedNeighborIds = useMemo(() => {
    const ids = new Set<string>()
    if (!activeSelectionId) return ids
    ids.add(activeSelectionId)
    for (const link of graphData.links) {
      const s = linkEndId(link.source)
      const t = linkEndId(link.target)
      if (s === activeSelectionId) ids.add(t)
      if (t === activeSelectionId) ids.add(s)
    }
    return ids
  }, [graphData, activeSelectionId])

  const labelIds3d = useMemo(() => {
    const ids = pickVisibleLabels(graphData.nodes, {
      activeId: activeSelectionId,
      neighborIds: selectedNeighborIds,
      globalScale: 2,
      limit: 15,
    })
    for (const id of pathNodeIds) ids.add(id)
    if (edgeFocusActive) for (const id of edgeFocusLabelIds) ids.add(id)
    return ids
  }, [graphData, activeSelectionId, selectedNeighborIds, pathNodeIds, edgeFocusLabelIds, edgeFocusActive])

  const rebuildFromNode = useCallback(
    (node: GraphNode) => {
      selectRootPaper(nodeToPaper(node))
      setSelectedNodeId(null)
      setCompareSelectedNodeId(null)
    },
    [selectRootPaper, setSelectedNodeId, setCompareSelectedNodeId],
  )

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (isCompare) {
        selectNode(node.id)
        return
      }
      const now = Date.now()
      const prev = lastClick.current
      if (prev && prev.id === node.id && now - prev.t < 320) {
        lastClick.current = null
        rebuildFromNode(node)
        return
      }
      lastClick.current = { id: node.id, t: now }
      selectNode(node.id)
    },
    [isCompare, rebuildFromNode, selectNode],
  )

  const rerootFromNode = useCallback(
    (node: GraphNode) => {
      if (isCompare) setComparePaper(nodeToPaper(node))
      else rebuildFromNode(node)
    },
    [isCompare, setComparePaper, rebuildFromNode],
  )

  const searchFromNode = useCallback(
    (node: GraphNode) => {
      const query = (node.title || node.label || node.id).trim()
      if (query) submitQuery({ query, query_type: 'keyword' })
    },
    [submitQuery],
  )

  const compareFromNode = useCallback(
    (node: GraphNode) => {
      setComparePaper(nodeToPaper(node))
    },
    [setComparePaper],
  )

  const handleNodeRightClick = useCallback((node: GraphNode, event?: MouseEvent) => {
    event?.preventDefault?.()
    setMenu({ x: event?.clientX ?? 0, y: event?.clientY ?? 0, node })
  }, [])

  const menuItems = useCallback(
    (node: GraphNode): NodeMenuItem[] => {
      const items: NodeMenuItem[] = [
        { label: '以此为根重建网络', onSelect: () => rerootFromNode(node) },
        { label: '按标题搜索', onSelect: () => searchFromNode(node) },
        {
          label: expandingId === node.id ? '展开中…' : '展开该节点',
          onSelect: () => {
            if (expandingId !== node.id) void expandNode(node)
          },
        },
      ]
      if (!isCompare && comparePaper?.id !== node.id) {
        items.push({ label: '加入对比', onSelect: () => compareFromNode(node) })
      }
      items.push({
        label: '设为关联起点',
        onSelect: () => {
          setConnectionFrom(nodeToPaper(node))
          setConnectionOpen(true)
        },
      })
      items.push({
        label: '设为关联终点',
        onSelect: () => {
          setConnectionTo(nodeToPaper(node))
          setConnectionOpen(true)
        },
      })
      if (pathActive) {
        items.push({ label: '清除关联路径', onSelect: () => clearConnection() })
      }
      if (connectionFrom || connectionTo) {
        // Also drops ?from/?to, otherwise a refresh brings the pair back.
        items.push({ label: '清除关联论文', onSelect: () => clearConnectionPair() })
      }
      if (node.url) {
        items.push({ label: '打开原文', onSelect: () => window.open(node.url, '_blank', 'noopener') })
      }
      return items
    },
    [
      rerootFromNode,
      searchFromNode,
      compareFromNode,
      isCompare,
      comparePaper,
      expandingId,
      expandNode,
      setConnectionFrom,
      setConnectionTo,
      setConnectionOpen,
      clearConnection,
      clearConnectionPair,
      connectionFrom,
      connectionTo,
      pathActive,
    ],
  )

  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x ?? 0
      const y = node.y ?? 0
      // The legend preview is the strongest signal: only links of the previewed
      // type and their endpoints stay lit, regardless of selection/hover state.
      // The root stays lit even when it has no edge of the previewed type: it is
      // the reader's anchor, and hiding it made the remaining star look random.
      const focused = edgeFocusActive && (edgeFocus.nodeIds.has(node.id) || node.isRoot)
      // A pinned community is the next strongest cue: papers outside it fade so
      // the cluster's own shape becomes readable. The root always stays visible.
      const inActiveCluster =
        activeClusterId !== null && clusterById.get(node.id) === activeClusterId
      const dim = edgeFocusActive
        ? !focused
        : activeClusterId !== null
          ? !inActiveCluster && !node.isRoot
          : (activeId !== null || pathActive) && !highlightIds.has(node.id)

      // Connection-path nodes get an emerald halo so the chain reads at a glance
      // even when the rest of the graph is dimmed out.
      if (!edgeFocusActive && pathActive && pathNodeIds.has(node.id)) {
        ctx.globalAlpha = 0.4
        ctx.beginPath()
        ctx.arc(x, y, node.size + 6 / globalScale, 0, 2 * Math.PI)
        ctx.fillStyle = 'rgba(16,185,129,0.5)'
        ctx.fill()
      }

      if (node.isRoot || activeSelectionId === node.id) {
        ctx.globalAlpha = dim ? 0.12 : 0.35
        ctx.beginPath()
        ctx.arc(x, y, node.size + 4 / globalScale, 0, 2 * Math.PI)
        ctx.fillStyle = node.isRoot ? 'rgba(255,107,53,0.45)' : 'rgba(255,215,0,0.4)'
        ctx.fill()
      }

      // The type preview is a root-centred star: everything else recedes to a
      // grey ghost so only the connected nodes remain readable.
      ctx.globalAlpha = dim ? 0.12 : 1
      ctx.beginPath()
      ctx.arc(x, y, node.size, 0, 2 * Math.PI)
      ctx.fillStyle = dim && edgeFocusActive ? '#2a2f3a' : node.color
      ctx.fill()
      ctx.lineWidth = (node.isRoot ? 2.5 : activeSelectionId === node.id ? 2 : 1.25) / globalScale
      ctx.strokeStyle = node.isRoot
        ? '#ff6b35'
        : activeSelectionId === node.id
          ? '#ffd700'
          : pathActive && pathNodeIds.has(node.id)
            ? '#10b981'
            : 'rgba(9,14,20,0.9)'
      ctx.stroke()

      if (markedIds.has(node.id)) {
        ctx.globalAlpha = dim ? 0.12 : 1
        ctx.beginPath()
        ctx.arc(x + node.size * 0.8, y - node.size * 0.8, Math.max(1.4, 3 / globalScale), 0, 2 * Math.PI)
        ctx.fillStyle = '#fbbf24'
        ctx.fill()
        ctx.lineWidth = 1 / globalScale
        ctx.strokeStyle = '#0b1220'
        ctx.stroke()
      }

      const showLabel = focused
        ? edgeFocusLabelIds.has(node.id)
        : (globalScale >= ZOOM_LABEL_THRESHOLD ? zoomLabelIds.has(node.id) : priorityLabelIds.has(node.id)) &&
          !dim
      if (showLabel) {
        const raw = node.title || node.label || ''
        const label = raw.length > 22 ? `${raw.slice(0, 22)}…` : raw
        const fontSize = 11 / globalScale
        ctx.font = `600 ${fontSize}px Inter, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        const tw = ctx.measureText(label).width
        const padX = 3 / globalScale
        const padY = 2 / globalScale
        const lx = x - tw / 2 - padX
        const ly = y + node.size + 3 / globalScale
        const lw = tw + padX * 2
        const lh = fontSize + padY * 2
        const isPriority = focused || priorityLabelIds.has(node.id)
        const overlaps = labelRectsRef.current.some(
          (r) => !(lx + lw < r.x || lx > r.x + r.w || ly + lh < r.y || ly > r.y + r.h),
        )
        if (isPriority || !overlaps) {
          labelRectsRef.current.push({ x: lx, y: ly, w: lw, h: lh })
          ctx.globalAlpha = 0.82
          ctx.fillStyle = '#0b1220'
          paintRoundedRect(ctx, lx, ly, lw, lh, 3 / globalScale)
          ctx.fill()
          ctx.globalAlpha = 1
          ctx.fillStyle = 'rgba(241,245,249,0.98)'
          ctx.fillText(label, x, ly + padY)
        }
      }
      ctx.globalAlpha = 1
    },
    [activeId, highlightIds, activeSelectionId, priorityLabelIds, zoomLabelIds, markedIds, pathActive, pathNodeIds, edgeFocus, edgeFocusActive, edgeFocusLabelIds, activeClusterId, clusterById],
  )

  const paintPointerArea = useCallback((node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(node.x ?? 0, node.y ?? 0, node.size + 3, 0, 2 * Math.PI)
    ctx.fill()
  }, [])

  const linkColor = useCallback(
    (link: GraphLink) => {
      const base = EDGE_COLORS[link.type] ?? EDGE_COLORS.reference
      const from = linkEndId(link.source)
      const to = linkEndId(link.target)
      const key = `${from}->${to}`
      // The legend preview outranks every other highlight state. Its keys carry
      // the type because a pair can have several parallel edges.
      if (edgeFocusActive) {
        return edgeFocus.linkKeys.has(`${link.type}|${key}`) ? base : withAlpha(base, 0.06)
      }
      // While a connection is on screen the path is the only thing that matters.
      if (pathActive) {
        if (pathLinkKeys.has(key)) return base
        const rootId = rootNode?.id
        const touchesRoot =
          !!rootId && (linkEndId(link.source) === rootId || linkEndId(link.target) === rootId)
        return withAlpha(base, touchesRoot ? 0.18 : 0.06)
      }
      // A pinned community lights its internal edges and fades everything else,
      // including edges that merely touch the root.
      if (activeClusterId !== null) {
        const internal =
          clusterById.get(from) === activeClusterId && clusterById.get(to) === activeClusterId
        if (internal) return base
        return withAlpha(base, 0.05)
      }
      // Root's direct predecessors/successors stay fully lit as a lineage cue.
      const rootId = rootNode?.id
      const isLineageEdge =
        !!rootId &&
        (link.type === 'reference' || link.type === 'citation') &&
        (linkEndId(link.source) === rootId || linkEndId(link.target) === rootId)
      if (!activeId) {
        if (isLineageEdge) return base
        // When colouring by community, fade edges that cross communities.
        const indirect = !isDirectedEdge(link.type)
        if (colorMode === 'cluster') {
          const same = clusterById.get(linkEndId(link.source)) === clusterById.get(linkEndId(link.target))
          return withAlpha(base, same ? (indirect ? 0.24 : 0.4) : (indirect ? 0.06 : 0.1))
        }
        return withAlpha(base, indirect ? 0.22 : 0.35)
      }
      return linkKeys.has(key) ? base : withAlpha(base, 0.06)
    },
    [activeId, linkKeys, colorMode, clusterById, rootNode, pathActive, pathLinkKeys, edgeFocus, edgeFocusActive, activeClusterId],
  )

  const nodeColor = useCallback(
    (node: GraphNode) => {
      if (edgeFocusActive) {
        return edgeFocus.nodeIds.has(node.id) || node.isRoot ? node.color : '#2a2f3a'
      }
      if (pathActive) return pathNodeIds.has(node.id) ? node.color : '#2a2f3a'
      if (activeClusterId !== null) {
        return clusterById.get(node.id) === activeClusterId || node.isRoot ? node.color : '#2a2f3a'
      }
      if (!activeId) return node.color
      return highlightIds.has(node.id) ? node.color : '#2a2f3a'
    },
    [activeId, highlightIds, pathActive, pathNodeIds, edgeFocus, edgeFocusActive, activeClusterId, clusterById],
  )

  const commonProps = {
    graphData,
    backgroundColor: '#111827',
    nodeColor,
    nodeVal: (n: GraphNode) => n.val,
    linkColor,
    linkWidth: (l: GraphLink) => {
      const key = `${linkEndId(l.source)}->${linkEndId(l.target)}`
      const focused = edgeFocusActive && edgeFocus.linkKeys.has(`${l.type}|${key}`)
      return linkWidthFor(l) * (focused ? 1.6 : 1)
    },
    linkDirectionalArrowLength: (l: GraphLink) => (isDirectedEdge(l.type) ? 4 : 0),
    linkDirectionalArrowRelPos: 0.9,
    linkDirectionalArrowColor: linkColor,
    onNodeClick: handleNodeClick,
    onNodeRightClick: handleNodeRightClick,
    onNodeHover: (n: GraphNode | null) => setHoverNode(n),
    onBackgroundClick: () => selectNode(null),
    onBackgroundRightClick: () => setMenu(null),
    onRenderFramePre: () => {
      labelRectsRef.current = []
    },
    onEngineStop: () => {
      setEngineTick((v) => v + 1)
      const now = Date.now()
      if (cacheKey && now - positionsSavedAt.current > 1500) {
        positionsSavedAt.current = now
        writeNetworkPositions(cacheKey, collectPositions(graphData.nodes))
      }
      if (fittedRef.current !== networkData) {
        fittedRef.current = networkData
        if (graphView === '3d') {
          fitCamera3D(fg3dRef.current, graphData.nodes)
        } else {
          fg2dRef.current?.zoomToFit?.(600, 60)
        }
      }
    },
    cooldownTicks: 200,
    warmupTicks: 30,
  }

  const prevViewRef = useRef(graphView)

  // Refit the camera when switching between 2D and 3D so the graph is not
  // left small/off-centre in the newly mounted renderer.
  useEffect(() => {
    if (prevViewRef.current === graphView) return
    prevViewRef.current = graphView
    fittedRef.current = null
    if (!dimensions) return
    const timer = window.setTimeout(() => {
      if (graphView === '3d') fitCamera3D(fg3dRef.current, graphData.nodes)
      else fg2dRef.current?.zoomToFit?.(600, 60)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [graphView, dimensions, graphData])

  useEffect(() => {
    if (graphView !== '2d') return
    const fg = fg2dRef.current
    if (!fg) return
    fg.d3Force('charge')?.strength(-260)
    fg.d3Force('link')?.distance((l: any) => ((l.source?.size ?? 5) + (l.target?.size ?? 5)) * 4 + 24)
    fg.d3Force('collide', forceCollide((n: any) => (n.size ?? 5) + 6).strength(1))
    fg.d3ReheatSimulation?.()
  }, [graphData, graphView, dimensions])

  useEffect(() => {
    const q = graphQuery.trim().toLowerCase()
    if (!q) return
    const target = graphData.nodes.find((n) => (n.title || n.label || '').toLowerCase().includes(q))
    if (!target || target.x == null || target.y == null) return
    if (graphView === '3d') {
      const dist = 160
      const x = target.x
      const y = target.y
      const z = target.z ?? 0
      const hyp = Math.hypot(x, y, z) || 1
      const ratio = 1 + dist / hyp
      fg3dRef.current?.cameraPosition({ x: x * ratio, y: y * ratio, z: z * ratio || dist }, target, 900)
    } else {
      fg2dRef.current?.centerAt(target.x, target.y, 900)
      fg2dRef.current?.zoom(2.2, 900)
    }
  }, [graphQuery, graphData, graphView, engineTick])

  const handleMinimapSelect = useCallback((gx: number, gy: number) => {
    fg2dRef.current?.centerAt(gx, gy, 600)
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-500" />
          <h3 className="mb-2 text-lg font-semibold text-white">正在构建网络图...</h3>
          <p className="text-gray-400">正在获取引用关系并计算网络结构</p>
          <div className="mt-4 space-y-1 text-xs text-gray-500">
            <p>• 获取论文引用数据</p>
            <p>• 构建节点和边关系</p>
            <p>• 计算网络布局</p>
            <p className="text-yellow-400">请耐心等待，大约需要10-30秒</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-red-400">网络构建失败</p>
          <p className="mt-2 text-sm text-gray-400">{(error as Error).message}</p>
        </div>
      </div>
    )
  }

  if (!networkData) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-gray-400">请选择一篇论文来生成网络图</p>
        </div>
      </div>
    )
  }

  if (!networkData.nodes || networkData.nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-yellow-400">网络数据为空</p>
          <p className="mt-2 text-sm text-gray-400">该论文可能没有可用的引用关系数据</p>
        </div>
      </div>
    )
  }

  const years = domainNodes
    .map((n) => n.year)
    .filter((y): y is number => typeof y === 'number')
  const minYear = years.length > 0 ? Math.min(...years) : 1990
  const maxYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear()

  return (
    <div
      ref={setContainer}
      className="relative h-full bg-gray-900"
      onContextMenu={(e) => e.preventDefault()}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setPointer({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }}
    >
      {dimensions && graphView === '2d' && (
        <ForceGraph2D
          ref={fg2dRef}
          width={dimensions.width}
          height={dimensions.height}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={paintPointerArea}
          {...commonProps}
        />
      )}

      {dimensions && graphView === '3d' && (
        <Graph3DErrorBoundary resetKey={`${cacheKey ?? ''}:${dimensions.width}x${dimensions.height}`}>
          <React.Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-gray-400">正在加载 3D 渲染器…</div>
            }
          >
            <ForceGraph3D
              key={`3d:${cacheKey ?? ''}`}
              ref={fg3dRef}
              width={dimensions.width}
              height={dimensions.height}
              linkDirectionalParticles={(l: GraphLink) => (isDirectedEdge(l.type) ? 2 : 0)}
              linkDirectionalParticleWidth={1.5}
              nodeRelSize={2}
              labelIds={labelIds3d}
              rendererConfig={{ preserveDrawingBuffer: true }}
              {...commonProps}
            />
          </React.Suspense>
        </Graph3DErrorBoundary>
      )}

      <GraphToolbar
        placement={isCompare ? 'bottom-left' : 'top-left'}
        nodeListOpen={nodeListOpen}
        onToggleNodeList={() => setNodeListOpen((v) => !v)}
        onExportPng={handleExportPng}
        onExportJsonVisible={handleExportJsonVisible}
        onExportJsonFull={handleExportJsonFull}
        onExportBibtex={handleExportBibtex}
        onExportCsv={handleExportCsv}
      />
      {!isCompare && (
        <GraphLegend
          nodes={graphData.nodes}
          rootNode={rootNode}
          onSelectRoot={handleSelectRoot}
          activeEdgeType={edgeFocusActive ? focusedEdgeType : null}
          focusEmpty={edgeFocusActive && edgeFocus.linkKeys.size === 0}
          onEdgeTypeHover={hoverEdgeType}
          activeClusterId={activeClusterId}
          pinnedClusterId={colorMode === 'cluster' ? clusterFocus : null}
          onClusterHover={setClusterHover}
          onClusterSelect={setClusterFocus}
        />
      )}
      {!isCompare && <GraphTimeline minYear={minYear} maxYear={maxYear} rootYear={rootNode?.year ?? null} />}
      {graphView === '2d' && engineTick > 0 && (
        <GraphMinimap nodes={graphData.nodes} selectedId={activeSelectionId} onSelect={handleMinimapSelect} />
      )}

      {nodeListOpen && (
        <GraphNodeList
          nodes={graphData.nodes}
          selectedId={activeSelectionId}
          onSelect={handleNodeListSelect}
          onReroot={rerootFromNode}
          onClose={() => setNodeListOpen(false)}
        />
      )}

      {!nodeListOpen && (
        <button
          type="button"
          onClick={() => setNodeListOpen(true)}
          title="点击查看节点列表"
          className={`absolute z-10 rounded-lg bg-gray-800/90 px-3 py-2 text-xs text-white transition-colors hover:bg-gray-700 ${
            isCompare ? 'bottom-4 right-4' : 'right-4 top-4'
          }`}
        >
          {filteredNodes.length} 节点 · {filteredEdges.length} 边
        </button>
      )}

      {hoverNode && pointer && <GraphTooltip node={hoverNode} x={pointer.x} y={pointer.y} />}

      {menu && (
        <NodeContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems(menu.node)}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
}

export default NetworkGraph

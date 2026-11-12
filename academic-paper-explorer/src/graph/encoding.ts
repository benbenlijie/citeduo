import type { NetworkNode, EdgeType } from '../types/domain'

export type ColorMode = 'cluster' | 'year' | 'field'
export type SizeMode = 'citations' | 'pagerank'

export const EDGE_COLORS: Record<EdgeType, string> = {
  reference: '#60a5fa',
  citation: '#4ade80',
  related: '#fbbf24',
  coupling: '#a78bfa',
  semantic: '#2dd4bf',
}

const FALLBACK_COLOR = '#94a3b8'

const CLUSTER_PALETTE = [
  '#22d3ee', '#a3e635', '#fb7185', '#fbbf24', '#818cf8',
  '#34d399', '#f472b6', '#60a5fa', '#fb923c', '#c084fc',
]

/** Colour for a community id; shared by the graph and the cluster legend. */
export function clusterColor(clusterId: number): string {
  if (!Number.isFinite(clusterId)) return FALLBACK_COLOR
  return CLUSTER_PALETTE[Math.abs(Math.trunc(clusterId)) % CLUSTER_PALETTE.length]
}

const FIELD_PALETTE = [
  '#38bdf8', '#4ade80', '#facc15', '#f472b6',
  '#a78bfa', '#fb923c', '#2dd4bf', '#e879f9',
]

const MIN_YEAR = 1970
const MIN_RADIUS = 5
const MAX_RADIUS = 18

export function yearColor(year?: number): string {
  if (!year) return FALLBACK_COLOR
  const maxYear = new Date().getFullYear()
  const t = Math.max(0, Math.min(1, (year - MIN_YEAR) / (maxYear - MIN_YEAR)))
  const hue = 200 - t * 185
  return `hsl(${Math.round(hue)}, 80%, 60%)`
}

export function fieldColor(fields?: string[]): string {
  const key = fields && fields.length > 0 ? fields[0] : ''
  if (!key) return FALLBACK_COLOR
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return FIELD_PALETTE[Math.abs(hash) % FIELD_PALETTE.length]
}

export function colorFor(node: NetworkNode, mode: ColorMode): string {
  switch (mode) {
    case 'cluster':
      return clusterColor(node.clusterId)
    case 'year':
      return yearColor(node.year)
    case 'field':
      return fieldColor(node.fieldsOfStudy)
  }
}

export function sizeFor(node: NetworkNode, mode: SizeMode): number {
  const raw = mode === 'citations' ? Math.sqrt(Math.max(0, node.citationCount)) * 1.2 : Math.max(0, node.pageRankScore) * 600
  const value = MIN_RADIUS + raw
  return Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, value))
}

export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return hex
  let h = m[1]
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function isDirectedEdge(type: EdgeType): boolean {
  return type === 'reference' || type === 'citation'
}

const MAX_LINK_WIDTH = 2.8

export function linkWidthFor(edge: { type: EdgeType; weight: number }): number {
  const w = Number.isFinite(edge.weight) && edge.weight > 0 ? edge.weight : 1
  let raw: number
  switch (edge.type) {
    case 'reference':
    case 'citation':
      raw = 1.4
      break
    case 'coupling':
      raw = 0.75 + Math.log2(w + 1) * 0.3
      break
    case 'related':
      raw = 0.75 + Math.log2(w + 1) * 0.25
      break
    case 'semantic':
      raw = 0.65 + Math.max(0, Math.min(1, w)) * 0.65
      break
  }
  return Math.max(0.5, Math.min(MAX_LINK_WIDTH, raw))
}

import React, { useEffect, useMemo, useRef } from 'react'
import type { GraphNode } from '../../graph/graphAdapter'

interface Props {
  nodes: GraphNode[]
  selectedId: string | null
  onSelect: (x: number, y: number) => void
}

const WIDTH = 180
const HEIGHT = 120
const PADDING = 8

const GraphMinimap: React.FC<Props> = ({ nodes, selectedId, onSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const bounds = useMemo(() => {
    if (nodes.length === 0) return null
    const xs = nodes.map((n) => n.x ?? 0)
    const ys = nodes.map((n) => n.y ?? 0)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    return { minX, minY, spanX: Math.max(1, maxX - minX), spanY: Math.max(1, maxY - minY) }
  }, [nodes])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx || !bounds) return
    ctx.clearRect(0, 0, WIDTH, HEIGHT)
    ctx.fillStyle = '#1f2937'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    const scale = Math.min((WIDTH - PADDING * 2) / bounds.spanX, (HEIGHT - PADDING * 2) / bounds.spanY)
    for (const n of nodes) {
      const px = PADDING + ((n.x ?? 0) - bounds.minX) * scale
      const py = PADDING + ((n.y ?? 0) - bounds.minY) * scale
      ctx.beginPath()
      ctx.arc(px, py, n.id === selectedId ? 2.5 : 1.4, 0, 2 * Math.PI)
      ctx.fillStyle = n.id === selectedId ? '#ffd700' : n.color
      ctx.fill()
    }
  }, [nodes, bounds, selectedId])

  if (!bounds) return null

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const scale = Math.min((WIDTH - PADDING * 2) / bounds.spanX, (HEIGHT - PADDING * 2) / bounds.spanY)
    const gx = bounds.minX + (e.clientX - rect.left - PADDING) / scale
    const gy = bounds.minY + (e.clientY - rect.top - PADDING) / scale
    onSelect(gx, gy)
  }

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      onClick={handleClick}
      className="absolute bottom-4 left-4 z-10 hidden cursor-pointer rounded-lg border border-gray-600 opacity-90 xl:block"
    />
  )
}

export default GraphMinimap

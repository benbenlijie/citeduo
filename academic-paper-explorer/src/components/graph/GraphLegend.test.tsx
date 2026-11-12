import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GraphLegend from './GraphLegend'
import { useUiStore } from '../../store/useUiStore'
import type { GraphNode } from '../../graph/graphAdapter'

function node(
  id: string,
  title: string,
  clusterId: number,
  extra: Partial<GraphNode> = {},
): GraphNode {
  return {
    id,
    label: title,
    title,
    citationCount: 3,
    authors: '',
    isRoot: false,
    pageRankScore: 0.1,
    clusterId,
    size: 15,
    color: '#22d3ee',
    year: 2018,
    val: 15,
    ...extra,
  } as GraphNode
}

const CLUSTERED = [
  node('v1', 'Video Understanding with Temporal Attention', 0, {
    year: 2016,
    fieldsOfStudy: ['Computer Vision'],
  }),
  node('v2', 'Video Understanding for Driver Distraction', 0, {
    year: 2020,
    fieldsOfStudy: ['Computer Vision'],
  }),
  node('t1', 'Vision Transformers for Image Recognition', 1, {
    year: 2021,
    fieldsOfStudy: ['Computer Vision'],
  }),
  node('t2', 'Adaptive Vision Transformers', 1, { year: 2022, fieldsOfStudy: ['Computer Vision'] }),
  node('solo', 'Unconnected Survey', 2, { year: 2019 }),
]

beforeEach(() => {
  useUiStore.setState({ colorMode: 'cluster', hiddenEdgeTypes: [] })
})

describe('GraphLegend edge toggles', () => {
  it('toggles an edge type when its legend entry is clicked', () => {
    render(<GraphLegend nodes={[]} />)
    const button = screen.getByRole('button', { name: /前置工作/ })
    fireEvent.click(button)
    expect(useUiStore.getState().hiddenEdgeTypes).toEqual(['reference'])
    expect(button).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(button)
    expect(useUiStore.getState().hiddenEdgeTypes).toEqual([])
  })

  it('invokes onSelectRoot when the root entry is clicked', () => {
    const onSelectRoot = vi.fn()
    render(<GraphLegend nodes={[]} onSelectRoot={onSelectRoot} />)
    fireEvent.click(screen.getByRole('button', { name: '根论文' }))
    expect(onSelectRoot).toHaveBeenCalledOnce()
  })
})

describe('GraphLegend edge previews', () => {
  it('reports the hovered type and clears it when the pointer leaves', () => {
    const onEdgeTypeHover = vi.fn()
    render(<GraphLegend nodes={[]} onEdgeTypeHover={onEdgeTypeHover} />)
    const button = screen.getByRole('button', { name: /相关（推荐）/ })

    fireEvent.mouseOver(button)
    expect(onEdgeTypeHover).toHaveBeenLastCalledWith('related')

    fireEvent.mouseOut(button)
    expect(onEdgeTypeHover).toHaveBeenLastCalledWith(null)
  })

  it('marks the previewed entry so the legend reflects the graph state', () => {
    render(<GraphLegend nodes={[]} activeEdgeType="coupling" />)
    const active = screen.getByRole('button', { name: /文献耦合/ })
    expect(active).toHaveTextContent('仅看此类')
    expect(active).toHaveClass('bg-gray-700/70')
  })
})

describe('GraphLegend clusters', () => {
  it('replaces bare cluster ids with topic names and paper counts', () => {
    render(<GraphLegend nodes={CLUSTERED} />)

    const video = screen.getByRole('button', { name: /video understanding/ })
    expect(video).toHaveTextContent('2')
    expect(screen.getByRole('button', { name: /vision transformers/ })).toHaveTextContent('2')
    // A one-paper community gets a count instead of a meaningless colour row.
    expect(screen.queryByRole('button', { name: /簇 2/ })).not.toBeInTheDocument()
    expect(screen.getByText('1 篇论文关系零散，未归入主题')).toBeInTheDocument()
  })

  it('previews a community on hover and shows what it contains', () => {
    const onClusterHover = vi.fn()
    render(<GraphLegend nodes={CLUSTERED} onClusterHover={onClusterHover} />)

    const row = screen.getByRole('button', { name: /video understanding/ })
    fireEvent.mouseOver(row)

    expect(onClusterHover).toHaveBeenLastCalledWith(0)
    expect(screen.getByText(/2 篇 · 40%/)).toBeInTheDocument()
    expect(screen.getByText('主要领域：Computer Vision')).toBeInTheDocument()
    expect(
      screen.getByText(/Video Understanding with Temporal Attention/),
    ).toBeInTheDocument()

    fireEvent.mouseOut(row)
    expect(onClusterHover).toHaveBeenLastCalledWith(null)
    expect(screen.queryByText(/主要领域/)).not.toBeInTheDocument()
  })

  it('pins a community until the same row is clicked again', () => {
    const onClusterSelect = vi.fn()
    const { rerender } = render(
      <GraphLegend nodes={CLUSTERED} onClusterSelect={onClusterSelect} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /video understanding/ }))
    expect(onClusterSelect).toHaveBeenLastCalledWith(0)

    rerender(
      <GraphLegend
        nodes={CLUSTERED}
        onClusterSelect={onClusterSelect}
        activeClusterId={0}
        pinnedClusterId={0}
      />,
    )
    const pinned = screen.getByRole('button', { name: /video understanding/ })
    expect(pinned).toHaveAttribute('aria-pressed', 'true')
    // The pinned row keeps its details on screen without hovering it.
    expect(screen.getByText(/2 篇 · 40%/)).toBeInTheDocument()

    fireEvent.click(pinned)
    expect(onClusterSelect).toHaveBeenLastCalledWith(null)
  })

  it('explains a sparse view instead of drawing one all-encompassing community', () => {
    render(
      <GraphLegend
        nodes={[
          node('a', 'Video Understanding', 0),
          node('b', 'Event Spotting', 0),
        ]}
      />,
    )
    expect(screen.getByText(/未形成明显的主题分区/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /视频|video understanding/i })).not.toBeInTheDocument()
  })
})

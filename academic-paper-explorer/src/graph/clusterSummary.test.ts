import { describe, it, expect } from 'vitest'
import { summarizeClusters } from './clusterSummary'
import type { NetworkNode } from '../types/domain'

function node(
  id: string,
  title: string,
  clusterId: number,
  extra: Partial<NetworkNode> = {},
): NetworkNode {
  return {
    id,
    label: title,
    title,
    citationCount: 10,
    authors: '',
    isRoot: false,
    pageRankScore: 0.1,
    clusterId,
    size: 15,
    color: '#ffffff',
    year: 2018,
    ...extra,
  } as NetworkNode
}

describe('summarizeClusters', () => {
  it('returns nothing for an empty view', () => {
    expect(summarizeClusters([])).toEqual([])
  })

  it('labels each community with the terms that distinguish it from the others', () => {
    const summaries = summarizeClusters([
      node('v1', 'Video Understanding with Temporal Attention', 0, { year: 2016 }),
      node('v2', 'Video Understanding for Driver Distraction', 0, { year: 2018 }),
      node('v3', 'Event Spotting in Video Understanding', 0, { year: 2020 }),
      node('t1', 'Vision Transformers for Image Recognition', 1, {
        fieldsOfStudy: ['Computer Vision'],
      }),
      node('t2', 'Adaptive Vision Transformers', 1, { fieldsOfStudy: ['Computer Vision'] }),
    ])

    expect(summaries).toHaveLength(2)
    const video = summaries.find((c) => c.id === 0)!
    expect(video.size).toBe(3)
    expect(video.share).toBeCloseTo(3 / 5)
    expect(video.keywords[0]).toBe('video understanding')
    expect(video.keywords).toContain('driver distraction')
    // Overlapping single words never repeat a phrase that is already chosen.
    expect(video.keywords.filter((k) => k.includes('video'))).toHaveLength(1)

    const transformers = summaries.find((c) => c.id === 1)!
    expect(transformers.keywords[0]).toBe('vision transformers')
    expect(video.label).not.toBe(transformers.label)
  })

  it('orders communities by size and keeps their year span and representative papers', () => {
    const summaries = summarizeClusters([
      node('a', 'Graph Neural Networks for Molecules', 0, { year: 2015, pageRankScore: 0.4 }),
      node('b', 'Graph Neural Networks at Scale', 0, { year: 2021, pageRankScore: 0.9 }),
      node('c', 'Vision Transformers', 1, { year: 2020 }),
      node('d', 'Diffusion Models', 2, { year: 2022 }),
      node('e', 'Image Recognition', 1, { year: 2019 }),
      node('f', 'Vision Transformers for Video', 1, { year: 2023 }),
    ])

    expect(summaries.map((c) => c.id)).toEqual([1, 0, 2])
    const molecules = summaries.find((c) => c.id === 0)!
    expect(molecules.yearRange).toEqual([2015, 2021])
    expect(molecules.topPapers.map((p) => p.id)).toEqual(['b', 'a'])
  })

  it('falls back to the field or a representative title when it cannot name a topic', () => {
    const fielded = summarizeClusters([
      node('m1', 'Deep Residual Learning for Image Recognition', 0, {
        fieldsOfStudy: ['Machine Learning'],
      }),
      node('m2', 'Attention Is All You Need', 0, { fieldsOfStudy: ['Machine Learning'] }),
    ])
    // A single community has no contrasting communities to compute IDF against.
    expect(fielded[0].keywords).toEqual([])
    expect(fielded[0].label).toBe('Machine Learning')

    const unnamed = summarizeClusters([
      node('x', 'Deep Residual Learning for Image Recognition', 0, {
        fieldsOfStudy: ['Computer Science'],
      }),
      node('y', 'Attention Is All You Need', 0, { fieldsOfStudy: ['Computer Science'] }),
    ])
    expect(unnamed[0].label).not.toBe('簇 0')
    expect(unnamed[0].label).toContain('Deep Residual')
  })

  it('shares the graph colour for a cluster id', () => {
    const [summary] = summarizeClusters([node('a', 'Alpha Beta Gamma', 7), node('b', 'Alpha Beta Delta', 7)])
    expect(summary.color).toMatch(/^#[0-9a-f]{6}$/)
    expect(summary.color).toBe(summarizeClusters([node('c', 'Alpha Beta', 7)])[0].color)
  })
})

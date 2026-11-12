import { describe, it, expect } from 'vitest'
import { focusSetsForEdgeType } from './edgeTypeFocus'
import type { GraphLink } from './graphAdapter'

const links: GraphLink[] = [
  { source: 'a', target: 'b', type: 'reference', weight: 1 },
  { source: { id: 'b' } as GraphLink['source'], target: 'c', type: 'semantic', weight: 0.5 },
  { source: 'a', target: 'c', type: 'semantic', weight: 0.6 },
  { source: 'b', target: 'c', type: 'reference', weight: 1 },
]

describe('focusSetsForEdgeType', () => {
  it('keeps only links of the requested type that touch the root', () => {
    const sets = focusSetsForEdgeType(links, 'reference', 'a')
    expect([...sets.linkKeys]).toEqual(['reference|a->b'])
    expect([...sets.nodeIds].sort()).toEqual(['a', 'b'])
  })

  it('excludes same-type links that do not touch the root', () => {
    const sets = focusSetsForEdgeType(links, 'reference', 'c')
    expect([...sets.linkKeys].sort()).toEqual(['reference|b->c'])
    expect([...sets.nodeIds].sort()).toEqual(['b', 'c'])
  })

  it('resolves links whose endpoints were already populated by force-graph', () => {
    const sets = focusSetsForEdgeType(links, 'semantic', 'a')
    expect([...sets.linkKeys]).toEqual(['semantic|a->c'])
    expect([...sets.nodeIds].sort()).toEqual(['a', 'c'])
  })

  it('returns empty sets when no type is previewed', () => {
    const sets = focusSetsForEdgeType(links, null, 'a')
    expect(sets.linkKeys.size).toBe(0)
    expect(sets.nodeIds.size).toBe(0)
  })

  it('returns empty sets when the type has no link at the root', () => {
    const sets = focusSetsForEdgeType(links, 'coupling', 'a')
    expect(sets.linkKeys.size).toBe(0)
    expect(sets.nodeIds.size).toBe(0)
  })

  it('returns empty sets without a root anchor', () => {
    const sets = focusSetsForEdgeType(links, 'reference', null)
    expect(sets.linkKeys.size).toBe(0)
    expect(sets.nodeIds.size).toBe(0)
  })
})

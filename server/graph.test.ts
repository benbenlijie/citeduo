import { test, expect } from 'bun:test'
import { connectedComponents, pagerank, bibliographicCoupling, edgeAnalysisWeight, scoreCandidate, rankCandidates } from './graph'

test('connected components assigns ids', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  const edges = [{ from: 'a', to: 'b' }]
  const comps = connectedComponents(nodes as any, edges as any)
  expect(comps.get('a')).toBe(comps.get('b'))
  expect(comps.get('c')).not.toBe(comps.get('a'))
})

test('pagerank sums to ~1 and favors linked node', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  const edges = [{ from: 'a', to: 'c' }, { from: 'b', to: 'c' }]
  const pr = pagerank(nodes as any, edges as any)
  const sum = [...pr.values()].reduce((s, v) => s + v, 0)
  expect(Math.abs(sum - 1)).toBeLessThan(1e-6)
  expect(pr.get('c')!).toBeGreaterThan(pr.get('a')!)
})

test('pagerank routes edges to ids outside nodes into dangling mass', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }]
  const edges = [{ from: 'a', to: 'ghost' }]
  const pr = pagerank(nodes as any, edges as any)
  const sum = [...pr.values()].reduce((s, v) => s + v, 0)
  expect(Math.abs(sum - 1)).toBeLessThan(1e-6)
  expect(pr.has('ghost')).toBe(false)
})

test('bibliographic coupling emits weighted edges for shared references', () => {
  const refs = new Map<string, Set<string>>([
    ['a', new Set(['r1', 'r2', 'r3'])],
    ['b', new Set(['r2', 'r3', 'r4'])],
    ['c', new Set(['r9'])],
  ])
  expect(bibliographicCoupling(refs, 2)).toEqual([
    { from: 'a', to: 'b', type: 'coupling', weight: 2 },
  ])
  expect(bibliographicCoupling(refs, 3)).toEqual([])
})

test('pagerank distributes rank by edge weight', () => {
  const nodes = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  const edges = [
    { from: 'a', to: 'b', type: 'reference', weight: 9 },
    { from: 'a', to: 'c', type: 'reference', weight: 1 },
  ]
  const pr = pagerank(nodes as any, edges as any)
  const sum = [...pr.values()].reduce((s, v) => s + v, 0)
  expect(Math.abs(sum - 1)).toBeLessThan(1e-6)
  expect(pr.get('b')!).toBeGreaterThan(pr.get('c')!)
})

test('scoreCandidate favors more links, citations and year proximity', () => {
  const strong = scoreCandidate({ links: 2, citationCount: 100, year: 2020 }, 2020)
  const weak = scoreCandidate({ links: 1, citationCount: 0, year: 1990 }, 2020)
  expect(strong).toBeGreaterThan(weak)
})

test('rankCandidates puts priority ids first, then ranks by score', () => {
  const stats = new Map([
    ['x', { links: 1, citationCount: 0 }],
    ['y', { links: 5, citationCount: 10 }],
    ['z', { links: 0, citationCount: 0 }],
  ])
  const ranked = rankCandidates(stats, new Set(['z']), 2020)
  expect(ranked[0]).toBe('z')
  expect(ranked.indexOf('y')).toBeLessThan(ranked.indexOf('x'))
})

test('bibliographic coupling filters weak cosine overlap from long reference lists', () => {
  const surveyRefs = Array.from({ length: 100 }, (_, i) => `r${i}`)
  const refs = new Map<string, Set<string>>([
    ['focusedA', new Set(['r0', 'r1', 'r2', 'r3'])],
    ['focusedB', new Set(['r0', 'r1', 'r2', 'r9'])],
    ['survey', new Set(surveyRefs)],
  ])
  // Survey shares 3-4 refs with focused papers, but cosine is ~4 / sqrt(4 * 100) = 0.2 or 3 / 20 = 0.15;
  // with minCosine 0.3 only the genuinely close pair survives.
  expect(bibliographicCoupling(refs, 3, { minCosine: 0.3 })).toEqual([
    { from: 'focusedA', to: 'focusedB', type: 'coupling', weight: 3 },
  ])
})

test('bibliographic coupling caps per-node neighbours instead of emitting an all-pairs clique', () => {
  const shared = ['r1', 'r2', 'r3', 'r4']
  const refs = new Map<string, Set<string>>([
    ['a', new Set([...shared, 'x1'])],
    ['b', new Set([...shared, 'x1'])],
    ['c', new Set([...shared, 'x2'])],
    ['d', new Set([...shared, 'x3'])],
    ['e', new Set([...shared, 'x4'])],
  ])
  // Uncapped: all 5 papers share >= 4 refs => 10 edges (complete K5).
  expect(bibliographicCoupling(refs, 4)).toHaveLength(10)
  // Capped to top-1 per paper: sparse backbone instead of K5.
  const pruned = bibliographicCoupling(refs, 4, { maxNeighbors: 1 })
  expect(pruned.length).toBeLessThanOrEqual(4)
  expect(pruned).toContainEqual({ from: 'a', to: 'b', type: 'coupling', weight: 5 })
})

test('edgeAnalysisWeight compresses coupling shared-reference counts onto a citation-comparable scale', () => {
  expect(edgeAnalysisWeight({ type: 'reference', weight: 1 })).toBe(1)
  const heavyCoupling = edgeAnalysisWeight({ type: 'coupling', weight: 60 })
  expect(heavyCoupling).toBeGreaterThan(2)
  expect(heavyCoupling).toBeLessThan(3)
})

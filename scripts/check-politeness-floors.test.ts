import { describe, expect, test } from 'bun:test'
import { checkFloors, defaultFor } from './check-politeness-floors'

const fixture = (s2: string) => `
num(Bun.env.ARXIV_API_MIN_INTERVAL_MS, 3000)
num(Bun.env.ARXIV_CONTENT_MIN_INTERVAL_MS, 1000)
num(Bun.env.S2_MIN_INTERVAL_MS, ${s2})
num(Bun.env.OPENALEX_MIN_INTERVAL_MS, 200)
`

describe('politeness floors', () => {
  test('checks the shared S2 default with and without a key', () => {
    expect(checkFloors(fixture('1000')).failures).toEqual([])
    expect(checkFloors(fixture('1000')).successes).toHaveLength(5)
  })
  test('rejects a lowered shared default for both S2 modes', () => {
    const failures = checkFloors(fixture('100')).failures
    expect(failures).toHaveLength(2)
    expect(failures[0]).toContain('Semantic Scholar anonymous')
    expect(failures[1]).toContain('Semantic Scholar keyed')
  })
  test('maps only the positive API-key condition to its branches', () => {
    const source = fixture('env.semanticScholarApiKey ? 1000 : 1500')
    expect(defaultFor(source, 'S2_MIN_INTERVAL_MS')).toBe(1500)
    expect(defaultFor(source, 'S2_MIN_INTERVAL_MS', true)).toBe(1000)
    expect(checkFloors(source).failures).toEqual([])
  })
  test('rejects a keyed branch below one request per second', () => {
    expect(checkFloors(fixture('env.semanticScholarApiKey ? 100 : 1000')).failures)
      .toEqual([expect.stringContaining('Semantic Scholar keyed')])
  })
  test.each(['!env.semanticScholarApiKey ? 100 : 1000',
    'env.otherKey ? 100 : 1000', 'unknownDefault'])('fails closed for %s', (value) => {
    expect(defaultFor(fixture(value), 'S2_MIN_INTERVAL_MS')).toBeNull()
    expect(checkFloors(fixture(value)).failures).toHaveLength(2)
  })
  test('names a lowered arXiv default and its source', () => {
    const source = fixture('1000').replace('ARXIV_API_MIN_INTERVAL_MS, 3000',
      'ARXIV_API_MIN_INTERVAL_MS, 1000')
    expect(checkFloors(source).failures).toEqual([
      expect.stringContaining('https://info.arxiv.org/help/api/tou.html')])
  })
  test('fails closed when a configured env variable disappears', () => {
    expect(checkFloors(fixture('1000').replace('OPENALEX_MIN_INTERVAL_MS', 'RENAMED')).failures)
      .toEqual([expect.stringContaining('could not determine a single default for OPENALEX_MIN_INTERVAL_MS')])
  })
  test.each([
    '// previous value: num(Bun.env.S2_MIN_INTERVAL_MS, 1000)',
    '/* num(Bun.env.S2_MIN_INTERVAL_MS, 1000) */',
  ])('ignores a default that only appears in a comment', (comment) => {
    const source = `${fixture('env.semanticScholarApiKey ? 100 : 1000')}\n${comment}\n`
    expect(checkFloors(source).failures).toEqual([
      expect.stringContaining('Semantic Scholar keyed')])
  })
  test('fails closed when the same default is defined twice', () => {
    const source = `num(Bun.env.S2_MIN_INTERVAL_MS, 1000)\n${fixture('env.semanticScholarApiKey ? 100 : 1000')}`
    expect(checkFloors(source).failures).toHaveLength(2)
  })
})

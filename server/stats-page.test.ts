import { test, expect } from 'bun:test'
import { renderStatsPage } from './stats-page'

test('stats page derives its API path from the public URL', () => {
  const html = renderStatsPage()
  expect(html).toContain("window.location.pathname.replace(/\\/stats\\/?$/, '')")
  expect(html).toContain("var API = MOUNT + '/api/admin/usage';")
  expect(html).not.toContain('__BASE__')
  expect(html).not.toContain('__API__')
  expect(html).toContain('使用统计')
})

test('stats page has no external script/style dependencies', () => {
  const html = renderStatsPage()
  expect(html).not.toMatch(/<script[^>]+src=/i)
  expect(html).not.toMatch(/<link[^>]+stylesheet/i)
})

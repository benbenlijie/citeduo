import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HeaderStarLink, ValueStarPrompt } from './StarConversionPrompt'
import {
  hasDiscoverySuccess,
  recordPaperOpenedFromRelation,
  rememberInitialPapers,
  resetConversionStateForTests,
} from '../lib/conversion'

beforeEach(() => {
  localStorage.clear()
  resetConversionStateForTests()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('conversion funnel & Star CTA', () => {
  it('distinguishes opening an intermediate bridge paper from clicking an initial endpoint', () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    rememberInitialPapers(['A', 'B'])
    expect(recordPaperOpenedFromRelation('A', { fromId: 'A', toId: 'B' }, 'connection_chain')).toBe(false)
    expect(hasDiscoverySuccess()).toBe(false)

    expect(recordPaperOpenedFromRelation('BRIDGE_X', { fromId: 'A', toId: 'B' }, 'connection_chain')).toBe(true)
    expect(hasDiscoverySuccess()).toBe(true)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/analytics/event')
    expect(JSON.parse(init.body)).toMatchObject({
      event: 'new_paper_opened',
      paperId: 'BRIDGE_X',
      meta: { source: 'connection_chain', valueVerified: true },
    })
  })

  it('renders post-value Star prompt with UTM parameters, tracks star_cta_click, and persists dismissal', () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    rememberInitialPapers(['A', 'B'])
    recordPaperOpenedFromRelation('BRIDGE_X', { fromId: 'A', toId: 'B' }, 'connection_chain')
    fetchMock.mockClear()

    render(<ValueStarPrompt visible={true} discoveredNewPaper={true} placement="connection_panel" />)

    expect(screen.getByText(/刚刚通过关联路径打开了一篇新论文/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /在 GitHub 上 Star/ })
    expect(link.getAttribute('href')).toContain('utm_source=citeduo.com')
    expect(link.getAttribute('href')).toContain('utm_campaign=value_verified_star')

    fireEvent.click(link)
    const events = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body).event)
    expect(events).toEqual(expect.arrayContaining(['star_cta_view', 'star_cta_click', 'github_outbound']))

    fireEvent.click(screen.getByRole('button', { name: '不再显示 Star 提示' }))
    expect(screen.queryByRole('link', { name: /在 GitHub 上 Star/ })).not.toBeInTheDocument()
  })

  it('renders non-intrusive header GitHub Star link', () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    render(<HeaderStarLink />)
    const link = screen.getByRole('link', { name: /GitHub Star/ })
    expect(link.getAttribute('href')).toContain('utm_content=app_header')
  })
})

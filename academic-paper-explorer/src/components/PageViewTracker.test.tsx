import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import { PageViewTracker } from './PageViewTracker'

afterEach(() => {
  vi.unstubAllGlobals()
})

test('reports the initial SPA path with the auth cookie', () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetchMock)

  render(
    <MemoryRouter>
      <PageViewTracker />
    </MemoryRouter>,
  )

  expect(fetchMock).toHaveBeenCalledTimes(1)
  const [url, init] = fetchMock.mock.calls[0]
  expect(url).toBe('/api/analytics/pageview')
  expect(init).toMatchObject({
    method: 'POST',
    credentials: 'same-origin',
    keepalive: true,
  })
  expect(JSON.parse(init.body)).toMatchObject({ path: '/', referrer: '' })
})

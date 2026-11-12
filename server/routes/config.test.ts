import { test, expect } from 'bun:test'
import { configRoute } from './config'

test('reports whether /connect may go upstream', async () => {
  const res = await configRoute()
  expect(res.status).toBe(200)
  const body = (await res.json()) as { data: { connectLocalOnly: boolean } }
  // The value follows CONNECT_LOCAL_ONLY; the shape is what the client needs.
  expect(typeof body.data.connectLocalOnly).toBe('boolean')
})

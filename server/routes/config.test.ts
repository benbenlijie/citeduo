import { test, expect } from 'bun:test'
import { configRoute } from './config'
import { env } from '../env'

test('reports whether /connect may go upstream', async () => {
  const res = await configRoute()
  expect(res.status).toBe(200)
  const body = (await res.json()) as { data: { connectLocalOnly: boolean } }
  // The value follows CONNECT_LOCAL_ONLY; the shape is what the client needs.
  expect(typeof body.data.connectLocalOnly).toBe('boolean')
})

test('exposes the configured public filing number and returns null when unset', async () => {
  const original = env.icpBeianNumber
  try {
    for (const number of [undefined, '测试ICP备00000000号-1']) {
      env.icpBeianNumber = number
      const res = await configRoute()
      const body = (await res.json()) as { data: { icpBeianNumber: string | null } }
      expect(body.data.icpBeianNumber).toBe(number ?? null)
    }
  } finally {
    env.icpBeianNumber = original
  }
})

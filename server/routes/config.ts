import { json } from '../errors'
import { config } from '../config'

/**
 * Client-visible defaults. The connect panel needs `connectLocalOnly` before it
 * can draw its upstream toggle: the toggle must open in the state the operator
 * configured, and must be disabled outright when upstream is globally off
 * (issue #7).
 */
export async function configRoute(): Promise<Response> {
  return json({ data: { connectLocalOnly: config.connect.localOnly } })
}

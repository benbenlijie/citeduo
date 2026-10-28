/**
 * Runs inside the opencode container before `opencode serve`.
 *
 * It reuses the application's config builder so the agent definition cannot
 * drift between local and container deployments: same provider, same prompt,
 * same allowlist (only paper_search / paper_section).
 */
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildOpencodeConfig, buildPaperToolSources } from './opencode-config'
import { loadProviders } from './llm'

const runtime = process.env.OPENCODE_RUNTIME_DIR ?? '/runtime'
const provider = loadProviders().find((p) => p.kind === 'openai' && p.baseUrl && p.model)
if (!provider) {
  console.error('[opencode] LLM_PROVIDERS has no usable openai provider; refusing to start')
  process.exit(1)
}
if (!process.env.PAPER_INTERNAL_TOKEN) {
  console.error('[opencode] PAPER_INTERNAL_TOKEN is required')
  process.exit(1)
}
if (!process.env.OPENCODE_SERVER_PASSWORD) {
  console.error('[opencode] OPENCODE_SERVER_PASSWORD is required')
  process.exit(1)
}

const steps = Math.max(1, Math.floor(Number(process.env.AI_MAX_STEPS ?? '8') || 8))
const toolsDir = join(runtime, '.opencode', 'tools')
mkdirSync(toolsDir, { recursive: true, mode: 0o700 })
const configPath = join(runtime, 'opencode.json')
writeFileSync(configPath, buildOpencodeConfig(provider, steps), { mode: 0o600 })
chmodSync(configPath, 0o600)
for (const [filename, source] of Object.entries(buildPaperToolSources())) {
  const toolPath = join(toolsDir, filename)
  writeFileSync(toolPath, source, { mode: 0o600 })
  chmodSync(toolPath, 0o600)
}
console.log(`[opencode] runtime ready provider=${provider.name} model=${provider.model ?? 'default'} steps=${steps}`)

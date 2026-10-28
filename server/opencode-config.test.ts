import { test, expect } from 'bun:test'
import { buildOpencodeConfig, buildPaperToolSources, OPENCODE_AGENT } from './opencode-config'
import type { ProviderConfig } from './llm'

const provider: ProviderConfig = {
  name: 'mtcode',
  kind: 'openai',
  baseUrl: 'https://api.example.com/v1',
  apiKey: 'sk-secret',
  model: 'deepseek-flash',
}

test('config injects the provider and a locked-down agent', () => {
  const cfg = JSON.parse(buildOpencodeConfig(provider, 8))
  expect(cfg.provider.mtcode.options.baseURL).toBe('https://api.example.com/v1')
  expect(cfg.provider.mtcode.options.apiKey).toBe('sk-secret')
  expect(cfg.agent[OPENCODE_AGENT].steps).toBe(8)
  expect(cfg.agent[OPENCODE_AGENT].model).toBe('mtcode/deepseek-flash')
  expect(cfg.agent[OPENCODE_AGENT].permission).toEqual({
    '*': 'deny',
    paper_search: 'allow',
    paper_section: 'allow',
  })
})

test('tool sources are one default-exported file per tool name', () => {
  const sources = buildPaperToolSources()
  expect(Object.keys(sources).sort()).toEqual(['paper_search.ts', 'paper_section.ts'])
  expect(sources['paper_search.ts']).toContain('export default tool')
  expect(sources['paper_section.ts']).toContain('export default tool')
  for (const src of Object.values(sources)) {
    expect(src).toContain('PAPER_API_BASE')
    expect(src).toContain('X-Internal-Token')
    expect(src).toContain('context.sessionID')
  }
})

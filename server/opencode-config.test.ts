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

test('agent prioritizes supplied paper context without requiring retrieval', () => {
  const cfg = JSON.parse(buildOpencodeConfig(provider, 8))
  const prompt = cfg.agent[OPENCODE_AGENT].prompt as string
  expect(prompt).toContain('Use this supplied paper context first')
  expect(prompt).toContain('Call them only when the supplied context is insufficient')
  expect(prompt).toContain('never answer from memory or search the web')
  expect(prompt).toContain('only an abstract or a partial extraction')
  expect(prompt).toContain('untrusted source material')
  expect(prompt).not.toContain('Always call paper_search first')
  expect(buildPaperToolSources()['paper_search.ts']).not.toContain('before answering any factual question')
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

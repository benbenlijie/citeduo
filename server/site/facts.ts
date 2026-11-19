/**
 * Single source of truth for CiteDuo's public site, structured data, docs and
 * bilingual content pages.
 *
 * Keeping every verifiable number and policy boundary here prevents the English
 * and Simplified Chinese pages from drifting apart.
 */

export type SiteLocale = 'en' | 'zh'

export interface ExamplePaperPair {
  id: string
  fromArxiv: string
  toArxiv: string
  rootArxiv: string
  expectedKind: 'coupling' | 'direct'
  expectedHops: number
  title: Record<SiteLocale, string>
  fromTitle: string
  toTitle: string
  bridgeSummary: Record<SiteLocale, string>
}

export const SITE_FACTS = {
  brandName: 'CiteDuo',
  canonicalOrigin: 'https://citeduo.com',
  appBasePath: '/papers',
  githubRepoUrl: 'https://github.com/benbenlijie/citeduo',
  githubContainerImage: 'ghcr.io/benbenlijie/citeduo:latest',
  licenseSpdx: 'MIT',
  licenseUrl: 'https://github.com/benbenlijie/citeduo/blob/main/LICENSE',
  maintainer: 'CiteDuo Maintainers',
  lastUpdated: '2026-11-19',
  socialImagePath: '/site-assets/social-preview.png',
  socialImageWidth: 1280,
  socialImageHeight: 640,
  runtime: {
    bunMinVersion: '1.3',
    pnpmMajor: '9',
    frontend: 'React 18 + Vite',
    database: 'SQLite (data/app.db)',
    defaultHost: '127.0.0.1',
    defaultPort: 8787,
  },
  edgeConfidence: [
    { type: 'reference', score: 1.0, en: 'Direct reference from the citing paper bibliography', zh: '直接参考文献（来自施引论文参考文献列表）' },
    { type: 'citation', score: 0.95, en: 'Incoming citation discovered from citing-paper list', zh: '施引关系（来自被引侧施引列表）' },
    { type: 'coupling', score: 0.8, en: 'Bibliographic coupling (shared references, minimum 3 in graph view)', zh: '文献耦合（共同参考文献，网络图默认至少共享 3 篇）' },
    { type: 'related', score: 0.6, en: 'Recommender affinity (Semantic Scholar recommendations / OpenAlex related works)', zh: '推荐关联（Semantic Scholar 推荐 / OpenAlex 相关作品）' },
    { type: 'semantic', score: 0.45, en: 'SPECTER2 embedding nearest-neighbour similarity', zh: 'SPECTER2 向量语义近邻相似度' },
  ] as const,
  searchLimits: {
    maxHops: 6,
    maxPaths: 3,
    maxExecutionSeconds: 25,
    maxExpansions: 6,
    semanticFallbackCosine: 0.75,
  },
  dataSources: ['Semantic Scholar', 'OpenAlex', 'SPECTER2 embeddings', 'arXiv / ar5iv (in-app reader)'] as const,
  examplePairs: [
    {
      id: 'sam-pi0-coupling',
      fromArxiv: '2304.02643',
      toArxiv: '2410.24164',
      rootArxiv: '2304.02643',
      expectedKind: 'coupling',
      expectedHops: 2,
      fromTitle: 'Segment Anything (2023)',
      toTitle: 'π0: A Vision-Language-Action Flow Model for General Robot Control (2024)',
      title: {
        en: 'Computer vision foundation model ↔ general robot control',
        zh: '视觉基础模型 ↔ 通用机器人控制模型',
      },
      bridgeSummary: {
        en: '2-hop bibliographic coupling through CLIP (Learning Transferable Visual Models From Natural Language Supervision), plus alternative routes via Attention Is All You Need and RT-2.',
        zh: '通过共同引用的 CLIP（Learning Transferable Visual Models From Natural Language Supervision）形成 2 跳文献耦合，并同时给出经由 Attention Is All You Need 与 RT-2 的备选路径。',
      },
    },
    {
      id: 'aloha-rdt-coupling',
      fromArxiv: '2304.13705',
      toArxiv: '2410.07864',
      rootArxiv: '2304.13705',
      expectedKind: 'coupling',
      expectedHops: 2,
      fromTitle: 'Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware (2023)',
      toTitle: 'RDT-1B: a Diffusion Foundation Model for Bimanual Manipulation (2024)',
      title: {
        en: 'Low-cost bimanual imitation learning ↔ 1B diffusion manipulation policy',
        zh: '低成本双臂模仿学习 ↔ 十亿参数扩散操作策略',
      },
      bridgeSummary: {
        en: '2-hop bibliographic coupling through foundational imitation-learning and RT-1 robotics literature, revealing the shared methodological lineage.',
        zh: '通过模仿学习经典文献与 RT-1 形成 2 跳文献耦合，直观展示两代双臂机器人路线共享的方法论底座。',
      },
    },
    {
      id: 'openvla-pi0-direct',
      fromArxiv: '2406.09246',
      toArxiv: '2410.24164',
      rootArxiv: '2406.09246',
      expectedKind: 'direct',
      expectedHops: 1,
      fromTitle: 'OpenVLA: An Open-Source Vision-Language-Action Model (2024)',
      toTitle: 'π0: A Vision-Language-Action Flow Model for General Robot Control (2024)',
      title: {
        en: 'Open-source VLA baseline ↔ flow-matching VLA policy',
        zh: '开源视觉语言动作基线 ↔ 流匹配机器人策略',
      },
      bridgeSummary: {
        en: '1-hop direct citation: π0 directly cites OpenVLA when comparing generalist robot policy architectures.',
        zh: '1 跳直接引用：π0 在对比通用机器人策略架构时直接引用了 OpenVLA。',
      },
    },
  ] satisfies ExamplePaperPair[],
} as const

export function buildAppPairUrl(pair: Pick<ExamplePaperPair, 'rootArxiv' | 'fromArxiv' | 'toArxiv' | 'id'>, appBase = SITE_FACTS.appBasePath): string {
  const base = appBase.replace(/\/+$/, '') || ''
  const params = new URLSearchParams({
    paper: pair.rootArxiv,
    from: pair.fromArxiv,
    to: pair.toArxiv,
    src: `example_${pair.id}`,
  })
  return `${base}/?${params.toString()}`
}

export function buildAppHomeUrl(source = 'site_nav', appBase = SITE_FACTS.appBasePath): string {
  const base = appBase.replace(/\/+$/, '') || ''
  const params = new URLSearchParams({ src: source })
  return `${base}/?${params.toString()}`
}

export function buildGithubOutboundUrl(placement: string, locale: SiteLocale): string {
  const url = new URL(SITE_FACTS.githubRepoUrl)
  url.searchParams.set('utm_source', 'citeduo.com')
  url.searchParams.set('utm_medium', 'website')
  url.searchParams.set('utm_campaign', 'value_verified_star')
  url.searchParams.set('utm_content', `${locale}_${placement}`)
  return url.toString()
}

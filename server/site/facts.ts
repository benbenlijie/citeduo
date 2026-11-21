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
  maintainerUrl: 'https://github.com/benbenlijie',
  lastUpdated: '2026-11-21',
  socialImagePath: '/site-assets/social-preview.jpg',
  socialImageWidth: 1280,
  socialImageHeight: 640,
  featureList: [
    'Two-paper relation analysis with ranked, explained paths',
    'Citation network exploration with 2D/3D graphs and topic clusters',
    'Local-first SQLite storage and self-hosting',
    'In-app arXiv reading with optional bilingual translation',
    'MIT-licensed open-source deployment',
  ],
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
        en: '2-hop bibliographic coupling through Attention Is All You Need, plus alternative routes through CLIP and a 2-hop path via RT-2.',
        zh: '通过共同引用的 Attention Is All You Need 形成 2 跳文献耦合；备选路线包括 CLIP 耦合与经由 RT-2 的 2 跳路径。',
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
        en: '2-hop bibliographic coupling through foundational imitation-learning work, with alternative coupling via RT-1 and deep conditional generative models.',
        zh: '通过共同引用的模仿学习经典工作形成 2 跳文献耦合；备选路线包括经由 RT-1 与深度条件生成模型的耦合。',
      },
    },
    {
      id: 'openvla-rt2-direct',
      fromArxiv: '2406.09246',
      toArxiv: '2307.15818',
      rootArxiv: '2406.09246',
      expectedKind: 'direct',
      expectedHops: 1,
      fromTitle: 'OpenVLA: An Open-Source Vision-Language-Action Model (2024)',
      toTitle: 'RT-2: Vision-Language-Action Models Transfer Web Knowledge to Robotic Control (2023)',
      title: {
        en: 'Open-source VLA baseline ↔ web-knowledge VLA baseline',
        zh: '开源视觉语言动作基线 ↔ 网页知识迁移机器人基线',
      },
      bridgeSummary: {
        en: '1-hop direct citation: OpenVLA cites RT-2 when comparing generalist vision-language-action policy architectures.',
        zh: '1 跳直接引用：OpenVLA 在对比通用视觉-语言-动作策略架构时直接引用了 RT-2。',
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

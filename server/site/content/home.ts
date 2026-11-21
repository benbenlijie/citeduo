import { SITE_FACTS, type SiteLocale } from '../facts'
import type { FaqItem } from '../types'

export interface HomePageCopy {
  metaTitle: string
  description: string
  eyebrow: string
  h1: string
  lead: string
  primaryCta: string
  secondaryCta: string
  openWorkspaceCta: string
  examplesHeading: string
  examplesSub: string
  tryPairLabel: string
  stepsHeading: string
  steps: { title: string; body: string }[]
  visualHeading: string
  visualSub: string
  visuals: { src: string; srcSet?: string; sizes?: string; alt: string; caption: string; width: number; height: number }[]
  diffHeading: string
  diffSub: string
  diffs: { title: string; body: string }[]
  fitHeading: string
  goodFitTitle: string
  goodFit: string[]
  notFitTitle: string
  notFit: string[]
  limitsHeading: string
  limits: string[]
  faq: FaqItem[]
  resourcesHeading: string
  resourcesSub: string
  starBannerHeading: string
  starBannerBody: string
  starBannerButton: string
  selfHostButton: string
}

export const HOME_COPY: Record<SiteLocale, HomePageCopy> = {
  en: {
    metaTitle: 'CiteDuo — Explainable Citation Paths Between Any Two Papers',
    description:
      'See how any two research papers are connected. Search papers, map citation networks, rank evidence paths, and self-host with Bun + SQLite.',
    eyebrow: `Open-source · ${SITE_FACTS.licenseSpdx} License · Local-first Bun + SQLite`,
    h1: 'See how any two research papers are actually connected.',
    lead:
      'Most literature tools draw a neighbourhood around one paper. CiteDuo also answers the harder question when two papers are already on your desk: whether they connect by direct citation, bibliographic coupling, co-citation, a multi-hop chain, or only embedding similarity — explained hop by hop, with alternatives.',
    primaryCta: 'Try with two example papers',
    secondaryCta: 'Star on GitHub',
    openWorkspaceCta: 'Open paper workspace',
    examplesHeading: 'Start with a verified two-paper example — no search query needed',
    examplesSub:
      'Each link below opens the interactive workspace at /papers/ with a real pair of papers and runs the relation analysis immediately.',
    tryPairLabel: 'Open live path analysis →',
    stepsHeading: 'From two paper titles to newly discovered bridge papers in four steps',
    steps: [
      {
        title: '1. Search or paste IDs',
        body: 'Query across Semantic Scholar and OpenAlex by keyword, DOI, arXiv ID, or Semantic Scholar ID — deduplicated by canonical DOI / arXiv key.',
      },
      {
        title: '2. Map the citation neighbourhood',
        body: 'Inspect PageRank-weighted 2D or 3D citation graphs with Louvain topic clusters, timeline scrubbing, and side-by-side comparison.',
      },
      {
        title: '3. Rank evidence-backed paths',
        body: 'Run two-paper connection search: direct references (1.0) and citations (0.95) outrank bibliographic coupling (0.8), recommender links (0.6), and SPECTER2 similarity (0.45).',
      },
      {
        title: '4. Open bridge papers & read in-app',
        body: 'Click intermediate bridge papers to inspect abstracts, lineage, or arXiv sections with optional bilingual paragraph translation.',
      },
    ],
    visualHeading: 'What the workspace shows',
    visualSub: 'Interactive graph exploration stays in /papers/; static explanations and guides stay fast and directly readable.',
    visuals: [
      {
        src: '/site-assets/two-paper-connection.png',
        srcSet:
          '/site-assets/two-paper-connection-1280.webp 1280w, /site-assets/two-paper-connection-1920.webp 1920w',
        sizes: '(max-width: 900px) 100vw, 50vw',
        alt: 'CiteDuo two-paper connection panel showing hop-by-hop explanation and alternative paths',
        caption: 'Hop-by-hop relation explanation with ranked evidence badges and up to 3 alternative paths.',
        width: 1920,
        height: 1080,
      },
      {
        src: '/site-assets/network-graph.png',
        srcSet: '/site-assets/network-graph-1280.webp 1280w, /site-assets/network-graph-1920.webp 1920w',
        sizes: '(max-width: 900px) 100vw, 50vw',
        alt: 'CiteDuo interactive citation network graph with topic cluster legend and timeline',
        caption: 'Citation neighbourhood with Louvain topic clusters, edge-type filters, and publication timeline.',
        width: 1920,
        height: 1080,
      },
    ],
    diffHeading: 'How CiteDuo differs from single-seed graph tools',
    diffSub: 'Tools like Inciteful also connect two papers; CiteDuo focuses on explicit edge provenance, weakest-hop scoring, and local-first ownership.',
    diffs: [
      {
        title: 'Evidence-typed, hop-by-hop explanations',
        body: 'Every hop keeps its edge provenance and direction. A shared reference is labelled bibliographic coupling, and an embedding match is labelled semantic similarity — never disguised as a direct citation.',
      },
      {
        title: 'Weakest-link path ranking + alternatives',
        body: `Paths are scored by both average and weakest hop confidence over up to ${SITE_FACTS.searchLimits.maxHops} hops, returning up to ${SITE_FACTS.searchLimits.maxPaths} structurally distinct routes by banning interior nodes.`,
      },
      {
        title: 'Local-first single process',
        body: `One Bun server and one SQLite file (${SITE_FACTS.runtime.database}). Cached papers, edges, graph layouts, notes, and collections stay on your machine.`,
      },
      {
        title: 'Clear licensing and privacy boundaries',
        body: 'First-party usage stats store no raw IP or user-agent strings. Public instances default to abstract-only mode (PAPER_CONTENT_MODE=off) to respect arXiv e-print redistribution terms.',
      },
    ],
    fitHeading: 'Who CiteDuo is built for — and when another tool is better',
    goodFitTitle: 'Strong fit',
    goodFit: [
      'Researchers checking how two specific papers, baselines, or subfields connect before writing related work.',
      'Graduate students tracing methodological lineage (shared ancestors vs shared citers) during literature reviews.',
      'Labs and individuals who want a self-hosted, MIT-licensed workspace without mandatory cloud accounts.',
    ],
    notFitTitle: 'Not the right fit',
    notFit: [
      'Full systematic-review screening pipelines (PRISMA deduplication, multi-reviewer blind voting) — use Rayyan or Covidence.',
      'Reference manager PDF libraries and Word/LaTeX citation insertion — pair CiteDuo BibTeX export with Zotero.',
      'Guaranteed exhaustive citation counts across paywalled indices — CiteDuo relies on Semantic Scholar and OpenAlex coverage.',
    ],
    limitsHeading: 'Known limitations & honest constraints',
    limits: [
      `Live connection search is bounded (${SITE_FACTS.searchLimits.maxExpansions} upstream expansion batches, ${SITE_FACTS.searchLimits.maxExecutionSeconds}s wall-clock cap) so queries finish predictably; very distant paths can be missed unless intermediate neighbourhoods are cached.`,
      'Public demo has a daily visitor and request budget and returns HTTP 429 once exhausted; self-host locally with Docker or Bun for unlimited queries.',
      'In-app full-text reading only covers arXiv/ar5iv papers and defaults to abstract-only on non-loopback hosts unless the operator explicitly enables PAPER_CONTENT_MODE=full.',
      'AI reading assistant is optional, disabled unless an operator configures opencode + AI_ACCESS_TOKEN, and never required for graph or path analysis.',
    ],
    faq: [
      {
        question: 'What does CiteDuo do?',
        answer:
          'CiteDuo searches papers, maps citation networks, and explains how two specific papers are connected through direct citations, bibliographic coupling, co-citation, multi-hop bridges, or semantic similarity.',
      },
      {
        question: 'Is CiteDuo open source?',
        answer:
          'Yes. CiteDuo is released under the MIT license. The source, issue tracker, and self-hosting instructions are on GitHub.',
      },
      {
        question: 'Can I self-host CiteDuo?',
        answer:
          'Yes. A self-hosted instance runs as one Bun process with one SQLite file. Docker is optional, and no account or cloud workspace is required.',
      },
    ],
    resourcesHeading: 'Guides, comparisons, and self-hosting docs',
    resourcesSub: 'Read the methodology, compare literature mapping tools fairly, or deploy CiteDuo on your own machine.',
    starBannerHeading: 'Found a bridge paper you would have missed?',
    starBannerBody:
      'CiteDuo is free, MIT-licensed, and developed in the open. If exploring a citation path saved you literature-review time, starring the repository helps other researchers discover and audit the project.',
    starBannerButton: 'Star benbenlijie/citeduo on GitHub',
    selfHostButton: 'Read self-hosting guide',
  },
  zh: {
    metaTitle: 'CiteDuo — 查清任意两篇学术论文如何相连的开源文献探索工具',
    description:
      '开源、本地优先的学术论文关系探索工具。支持引文网络可视化、按证据强度逐跳解释两篇论文的关联路径、备选路线对比、arXiv 阅读翻译，以及 Bun + SQLite 自托管部署。',
    eyebrow: `开源项目 · ${SITE_FACTS.licenseSpdx} 许可证 · 本地优先 Bun + SQLite`,
    h1: '查清任意两篇学术论文到底是怎么连上的。',
    lead:
      '大多数文献图谱工具只围绕单篇论文画出一圈邻居。当你手头已经有两篇论文时，CiteDuo 还能直接回答第二个问题：它们究竟是直接引用、共同引用同一批文献（文献耦合）、被同一批后继工作并列引用（共被引）、多跳引用链，还是仅仅摘要向量接近——逐跳给出证据说明，并展示备选路线。',
    primaryCta: '用两篇示例论文体验',
    secondaryCta: '在 GitHub 上点 Star',
    openWorkspaceCta: '进入论文工作台',
    examplesHeading: '无需先想搜索词：直接点开已验证的双论文关系示例',
    examplesSub:
      '下面每组链接都会直接打开 /papers/ 交互工作台，填入真实论文对并立即计算关联路径。',
    tryPairLabel: '打开实时关联路径 →',
    stepsHeading: '四步走通“搜索论文 → 查清关系 → 发现关键桥梁论文”',
    steps: [
      {
        title: '1. 搜索论文或粘贴编号',
        body: '支持关键词、DOI、arXiv ID、Semantic Scholar ID 联合检索 Semantic Scholar 与 OpenAlex，自动按标准标识去重。',
      },
      {
        title: '2. 展开引用网络与聚类',
        body: '查看按 PageRank 加权的 2D/3D 引用图、Louvain 主题簇、发表年份时间轴回放，以及双论文分屏对比。',
      },
      {
        title: '3. 按证据强度排序路径',
        body: '执行双论文关联检索：直接参考文献（1.0）与施引关系（0.95）优先于文献耦合（0.8）、推荐关联（0.6）与 SPECTER2 语义相似（0.45）。',
      },
      {
        title: '4. 打开桥梁论文并深入阅读',
        body: '点击路径中间的桥梁论文查看摘要与引文谱系，对 arXiv 论文可直接打开双语分段对照阅读器。',
      },
    ],
    visualHeading: '工作台实景预览',
    visualSub: '重交互图谱保留在 /papers/ 工作台；方法说明与对比指南直接由服务端输出清晰正文。',
    visuals: [
      {
        src: '/site-assets/two-paper-connection.png',
        srcSet:
          '/site-assets/two-paper-connection-1280.webp 1280w, /site-assets/two-paper-connection-1920.webp 1920w',
        sizes: '(max-width: 900px) 100vw, 50vw',
        alt: 'CiteDuo 双论文关联路径面板，展示逐跳中文解释与备选路径',
        caption: '逐跳解释两篇论文如何相连，标注关系证据类型并提供最多 3 条备选路线。',
        width: 1920,
        height: 1080,
      },
      {
        src: '/site-assets/network-graph.png',
        srcSet: '/site-assets/network-graph-1280.webp 1280w, /site-assets/network-graph-1920.webp 1920w',
        sizes: '(max-width: 900px) 100vw, 50vw',
        alt: 'CiteDuo 交互式引文网络图，包含主题聚类图例与年份时间轴',
        caption: '支持 Louvain 主题聚类、边类型开关与时间轴演进回放的引文网络图。',
        width: 1920,
        height: 1080,
      },
    ],
    diffHeading: 'CiteDuo 与常见单中心文献图谱工具的核心差异',
    diffSub: 'Inciteful 等工具也提供双论文连接；CiteDuo 的重点是边证据溯源、最弱跳约束评分以及本地优先的数据可控性。',
    diffs: [
      {
        title: '区分边证据类型，绝不把相似冒充引用',
        body: '每一跳都保留关系来源与方向：共同参考文献明确标为“文献耦合”，向量近邻明确标为“语义相似”，不会伪装成直接引用。',
      },
      {
        title: '兼顾均值与最弱跳评分，并给备选路径',
        body: `在最多 ${SITE_FACTS.searchLimits.maxHops} 跳范围内同时惩罚薄弱环节与冗长跳数，并通过屏蔽中间节点额外寻找最多 ${SITE_FACTS.searchLimits.maxPaths} 条结构不同的路线。`,
      },
      {
        title: '单进程 + 单文件本地优先架构',
        body: `单个 Bun 进程加单个 SQLite 文件（${SITE_FACTS.runtime.database}），缓存的论文、关系边、图布局、笔记与收藏全部留在本地。`,
      },
      {
        title: '清晰的条款合规与隐私边界',
        body: '第一方统计不记录原始 IP 与原始浏览器标识；非本机回环部署默认启用摘要模式（PAPER_CONTENT_MODE=off），严格尊重 arXiv 全文分发条款。',
      },
    ],
    fitHeading: '谁适合使用 CiteDuo，什么场景更适合其他工具',
    goodFitTitle: '适合的场景',
    goodFit: [
      '写 Related Work 前，手上已有两篇代表性论文，想快速弄清它们的方法演进或共同文献底座。',
      '做文献综述时，希望区分“直接继承”“共同引用经典（文献耦合）”和“被后人并列讨论（共被引）”。',
      '希望在个人电脑或课题组服务器自托管 MIT 开源工具，不依赖强制云账号。',
    ],
    notFitTitle: '不适合直接替代的场景',
    notFit: [
      '医学或社会科学系统综述（PRISMA 多人盲筛流程）——更适合使用 Rayyan 或 Covidence。',
      '本地海量 PDF 管理与 Word / LaTeX 正文引文插入——建议将 CiteDuo 导出的 BibTeX 配合 Zotero 使用。',
      '需要闭源商业数据库的绝对完整被引计数——CiteDuo 的覆盖面取决于 Semantic Scholar 与 OpenAlex。',
    ],
    limitsHeading: '已知限制与客观边界',
    limits: [
      `实时联网路径扩展设有明确上限（最多 ${SITE_FACTS.searchLimits.maxExpansions} 轮批量扩展、单次上限 ${SITE_FACTS.searchLimits.maxExecutionSeconds} 秒），跨度极大的冷门链路在未缓存中间邻域时可能无法一次命中。`,
      '在线公开体验站设有每日访客与请求预算，超限后返回友好的 HTTP 429；用 Docker 或源码在本地运行即可无限制使用。',
      '应用内全文阅读仅面向 arXiv / ar5iv 论文，且公网实例默认只展示摘要与原文链接，除非运维者在确认许可后显式开启 PAPER_CONTENT_MODE=full。',
      'AI 阅读助手属于可选增强（需配置 opencode 与 AI_ACCESS_TOKEN），未启用时完全不影响搜索、建图与双论文路径分析。',
    ],
    faq: [
      {
        question: 'CiteDuo 是做什么的？',
        answer:
          'CiteDuo 可以搜索论文、展开引文网络，并解释两篇指定论文如何通过直接引用、文献耦合、共被引、多跳桥梁或语义相似相连。',
      },
      {
        question: 'CiteDuo 是开源的吗？',
        answer:
          '是。CiteDuo 采用 MIT 许可证，源码、Issue 和自托管说明都在 GitHub 上。',
      },
      {
        question: '可以自托管 CiteDuo 吗？',
        answer:
          '可以。自托管实例只需要一个 Bun 进程和一个 SQLite 文件，Docker 可选，不需要账号或云端工作区。',
      },
    ],
    resourcesHeading: '实用指南、工具对比与自托管文档',
    resourcesSub: '了解双论文路径算法细节、客观对比主流文献图谱工具，或用一条命令完成本地部署。',
    starBannerHeading: '刚刚通过关联路径发现了原本漏掉的桥梁论文？',
    starBannerBody:
      'CiteDuo 采用 MIT 许可证完全开源。如果一次双论文关系分析帮你省下了翻查参考文献的时间，欢迎去 GitHub 点一颗 Star，帮助更多研究者发现和审阅这个项目。',
    starBannerButton: '去 GitHub 给 benbenlijie/citeduo 点 Star',
    selfHostButton: '查看自托管部署指南',
  },
}

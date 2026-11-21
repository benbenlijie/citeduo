import { SITE_FACTS, type SiteLocale } from '../facts'

export interface AboutSection {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

export interface AboutCopy {
  metaTitle: string
  description: string
  eyebrow: string
  h1: string
  lead: string
  sections: AboutSection[]
  workspaceCta: string
  githubCta: string
}

export const ABOUT_COPY: Record<SiteLocale, AboutCopy> = {
  en: {
    metaTitle: 'About CiteDuo: Open-Source Literature Relation Explorer',
    description:
      'Learn what CiteDuo is, how it ranks two-paper paths, which data sources it uses, what it does not do, and how to self-host it.',
    eyebrow: 'About · Product facts, methodology, and boundaries',
    h1: 'What CiteDuo is — and what it is not',
    lead:
      'CiteDuo is an MIT-licensed, local-first tool for exploring citation networks and explaining how two papers are connected. It is built for researchers who want evidence-typed paths, not an opaque similarity score.',
    sections: [
      {
        heading: 'What CiteDuo does',
        paragraphs: [
          'CiteDuo searches Semantic Scholar and OpenAlex, merges duplicate papers by DOI or arXiv identity, and builds an interactive citation neighbourhood around a paper or a pair of papers.',
          'Its main differentiator is two-paper relation analysis: it ranks paths by edge provenance, explains every hop, and shows structurally different alternatives instead of one unlabeled line.',
        ],
        bullets: [
          'Search papers by keyword, DOI, arXiv ID, or Semantic Scholar ID.',
          'Explore 2D or 3D citation graphs with topic clusters and a publication timeline.',
          'Rank direct references, citations, bibliographic coupling, recommender links, and embedding similarity separately.',
          'Open arXiv sections in the reader and optionally translate paragraphs in the browser.',
          'Keep cached graphs, notes, favourites, and collections in a local SQLite file.',
        ],
      },
      {
        heading: 'How two-paper paths are ranked',
        paragraphs: [
          'CiteDuo does not treat every graph edge as the same claim. Direct references and citations carry the strongest structural evidence. Bibliographic coupling and co-citation describe shared ancestry or shared later discussion. Recommender affinity and SPECTER2 similarity are explicitly lower-confidence signals.',
          'A path is scored with both its average hop confidence and its weakest hop, so one weak semantic bridge cannot hide inside a chain of strong citations. The app can also return alternative routes by blocking interior nodes.',
        ],
        bullets: [
          'Direct reference: 1.0',
          'Incoming citation: 0.95',
          'Bibliographic coupling: 0.8 base, scaled by shared references',
          'Recommender affinity: 0.6',
          'SPECTER2 embedding similarity: 0.45',
        ],
      },
      {
        heading: 'What CiteDuo is not',
        paragraphs: [
          'A negative result from a bounded live search is inconclusive, not proof that two papers are unrelated. Upstream metadata can be incomplete, especially for new preprints.',
        ],
        bullets: [
          'Not a PRISMA systematic-review screening or multi-reviewer voting tool.',
          'Not a reference manager or Word/LaTeX citation inserter.',
          'Not an exhaustive citation index across paywalled databases.',
          'Not a replacement for reading the citing paragraph in the original paper.',
        ],
      },
      {
        heading: 'Data, privacy, and self-hosting',
        paragraphs: [
          `CiteDuo uses Semantic Scholar, OpenAlex, SPECTER2 embeddings, and arXiv/ar5iv content. The app runs as one Bun process with one SQLite database (${SITE_FACTS.runtime.database}); no account or cloud workspace is required.`,
          'The public demo has a daily visitor/request budget. A self-hosted instance can run locally with Docker or Bun. In-app full-text access depends on arXiv availability and the operator’s PAPER_CONTENT_MODE setting.',
        ],
      },
      {
        heading: 'Maintainer and contact',
        paragraphs: [
          `CiteDuo is maintained by ${SITE_FACTS.maintainer} and released under the ${SITE_FACTS.licenseSpdx} license. Use GitHub issues for bug reports and feature discussions; security reports should follow the repository’s SECURITY.md.`,
        ],
      },
    ],
    workspaceCta: 'Open the paper workspace',
    githubCta: 'View CiteDuo on GitHub',
  },
  zh: {
    metaTitle: '关于 CiteDuo：开源自托管文献关系探索工具',
    description:
      '了解 CiteDuo 是什么、如何排序双论文路径、使用哪些数据源、有哪些边界，以及如何自托管部署。',
    eyebrow: '关于 · 产品事实、方法与边界',
    h1: 'CiteDuo 是什么，以及它不是什么',
    lead:
      'CiteDuo 是一个 MIT 许可证、本地优先的引文网络与双论文关系探索工具。它服务的是希望看到“证据类型 + 逐跳解释”的研究者，而不是只给一个不可解释相似度分数的工具。',
    sections: [
      {
        heading: 'CiteDuo 做什么',
        paragraphs: [
          'CiteDuo 联合检索 Semantic Scholar 与 OpenAlex，按 DOI 或 arXiv 标识合并重复论文，并围绕一篇或两篇论文构建可交互的引用邻域。',
          '核心差异是双论文关系分析：按边的证据来源排序路径、逐跳解释，并展示结构不同的备选路线，而不是只画一条没有语义的连线。',
        ],
        bullets: [
          '按关键词、DOI、arXiv ID 或 Semantic Scholar ID 检索论文。',
          '查看 2D/3D 引文图、Louvain 主题簇和发表年份时间轴。',
          '分别标注直接引用、施引、文献耦合、推荐关联与向量相似。',
          '在应用内阅读 arXiv 章节，并可选择段落级双语翻译。',
          '把图谱缓存、笔记、收藏和集合保存在本地 SQLite 文件中。',
        ],
      },
      {
        heading: '双论文路径如何排序',
        paragraphs: [
          'CiteDuo 不会把所有图谱边当成同一种结论。直接参考文献和施引关系是最强的结构证据；文献耦合与共被引描述共同前驱或后续共同讨论；推荐关联与 SPECTER2 语义相似被明确标为低置信度信号。',
          '路径分数同时考虑平均跳置信度和最弱跳置信度，避免一段牵强的语义桥藏在强引用链中间。工具还可以屏蔽首条路径的中间节点，返回结构不同的备选路线。',
        ],
        bullets: [
          '直接参考文献：1.0',
          '施引关系：0.95',
          '文献耦合：0.8 基础分，随共同参考文献数量上调',
          '推荐关联：0.6',
          'SPECTER2 语义相似：0.45',
        ],
      },
      {
        heading: 'CiteDuo 不是什么',
        paragraphs: [
          '有界实时检索没有找到路径，只能说明本次检索未命中，不能证明两篇论文无关；上游元数据对新预印本尤其可能不完整。',
        ],
        bullets: [
          '不是 PRISMA 系统综述的多人盲筛或投票工具。',
          '不是文献管理器，也不负责 Word/LaTeX 正文引文插入。',
          '不是覆盖所有付费数据库的绝对完整引文索引。',
          '不能替代阅读施引段落原文和判断引用语境。',
        ],
      },
      {
        heading: '数据、隐私与自托管',
        paragraphs: [
          `CiteDuo 使用 Semantic Scholar、OpenAlex、SPECTER2 向量与 arXiv/ar5iv 内容。应用以单个 Bun 进程和单个 SQLite 数据库（${SITE_FACTS.runtime.database}）运行，不需要账号或云端工作区。`,
          '公开 Demo 有每日访客/请求预算；自托管实例可以用 Docker 或 Bun 在本地无限使用。应用内全文访问取决于 arXiv 可用性和运维者的 PAPER_CONTENT_MODE 设置。',
        ],
      },
      {
        heading: '维护者与联系',
        paragraphs: [
          `CiteDuo 由 ${SITE_FACTS.maintainer} 维护，采用 ${SITE_FACTS.licenseSpdx} 许可证。Bug 和功能讨论请使用 GitHub Issues；安全问题请遵循仓库的 SECURITY.md。`,
        ],
      },
    ],
    workspaceCta: '打开论文工作台',
    githubCta: '查看 GitHub 仓库',
  },
}

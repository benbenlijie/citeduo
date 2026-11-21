import type { SiteLocale } from '../facts'
import type { ArticleCategory } from '../types'

export interface CategoryCopy {
  metaTitle: string
  description: string
  eyebrow: string
  h1: string
  lead: string
  sections: { heading: string; paragraphs: string[] }[]
}

export const CATEGORY_COPY: Record<ArticleCategory, Record<SiteLocale, CategoryCopy>> = {
  guides: {
    en: {
      metaTitle: 'Citation Network Guides | CiteDuo',
      description:
        'Practical guides to two-paper relation checks, citation paths, bibliographic coupling, co-citation, and literature-review workflows.',
      eyebrow: 'Guides · Evidence-first literature workflows',
      h1: 'Citation network guides for real literature workflows',
      lead:
        'Start with the question you actually have: are these two papers related, how did an idea travel, or how should you structure a literature review?',
      sections: [
        {
          heading: 'Start with the evidence question',
          paragraphs: [
            'If you already have two papers, begin with the two-paper relation guide. It checks direct citations, shared references, co-citation, bridge papers, and semantic similarity in decreasing order of evidence strength.',
            'If you are planning a review, start with the five-step citation-network workflow. Use clusters to define subsections, the timeline to separate foundational work from recent baselines, and cross-cluster bridge analysis to find the papers that connect competing approaches.',
          ],
        },
      ],
    },
    zh: {
      metaTitle: '引文网络指南 | CiteDuo',
      description:
        '从双论文关系核验、引用链路、文献耦合、共被引到文献综述工作流，提供可执行的证据优先指南。',
      eyebrow: '方法指南 · 证据优先的文献工作流',
      h1: '面向真实文献工作的引文网络指南',
      lead:
        '先从你真正要回答的问题出发：两篇论文是否相关、一个想法如何演进，或者文献综述应该怎样组织结构。',
      sections: [
        {
          heading: '先确定你要回答的证据问题',
          paragraphs: [
            '如果手头已经有两篇论文，先读双论文关系核验指南：按直接引用、共同参考文献、共被引、桥梁论文和语义相似的顺序逐级检查。',
            '如果正在规划文献综述，先读五步引文网络工作流：用主题簇划小节，用时间轴区分奠基工作与近期基线，再用跨簇寻桥找出连接不同流派的中间文献。',
          ],
        },
      ],
    },
  },
  compare: {
    en: {
      metaTitle: 'Literature Mapping Tool Comparisons | CiteDuo',
      description:
        'Compare CiteDuo with Connected Papers, Inciteful, Litmaps, and ResearchRabbit on two-paper paths, graphs, self-hosting, and data ownership.',
      eyebrow: 'Comparisons · Literature mapping landscape',
      h1: 'Compare literature mapping tools without the marketing fog',
      lead:
        'Each tool has a different center of gravity: cloud collections, corpus filtering, interactive graphs, or local-first ownership. Use the comparison that matches your workflow.',
      sections: [
        {
          heading: 'Compare by workflow, not feature count',
          paragraphs: [
            'Cloud collection tools are strong when you want saved libraries and new-paper alerts. Hosted corpus tools are strong when you need to filter large citation tables quickly. Local-first tools are stronger when data ownership, unlimited graph building, or offline work matters.',
            'For the specific question “how are these two papers connected?”, compare the tools on path evidence, alternatives, explanation quality, and whether the result is reproducible on your own machine.',
          ],
        },
      ],
    },
    zh: {
      metaTitle: '文献图谱工具对比 | CiteDuo',
      description:
        '对比 CiteDuo 与 Connected Papers、Inciteful、Litmaps、ResearchRabbit 在双论文路径、图谱、自托管与数据归属上的差异。',
      eyebrow: '工具对比 · 文献图谱生态',
      h1: '去掉营销滤镜，客观比较文献图谱工具',
      lead:
        '不同工具的重心不同：云端收藏、语料筛选、交互图谱或本地优先。先按你的真实工作流选择，而不是只看功能清单。',
      sections: [
        {
          heading: '按工作流比较，而不是按功能数量比较',
          paragraphs: [
            '需要长期保存文献集合并接收新论文提醒时，云端收藏型工具更顺手；需要快速筛选大规模引文表时，托管式语料工具更高效；重视数据归属、无限建图或离线使用时，本地优先工具更合适。',
            '如果问题具体到“这两篇论文怎么连上”，就比较路径证据、备选路线、解释质量和能否在自己的机器上复现，而不是只看宣传页上的功能数量。',
          ],
        },
      ],
    },
  },
  docs: {
    en: {
      metaTitle: 'CiteDuo Docs & Self-Hosting | CiteDuo',
      description:
        'Self-host CiteDuo with Bun, SQLite, Docker, and Nginx. Learn configuration, privacy boundaries, and deployment basics.',
      eyebrow: 'Documentation · Deploy and operate CiteDuo',
      h1: 'CiteDuo documentation and self-hosting',
      lead:
        'Run one Bun process and one SQLite file on your own machine, or deploy behind Nginx. These docs cover the operational facts without hiding the trade-offs.',
      sections: [
        {
          heading: 'Operate from verifiable facts',
          paragraphs: [
            'CiteDuo runs as one Bun process with one SQLite database. Docker is convenient, but the source path is equally supported. Upstream API keys are optional and mainly improve rate limits.',
            'Public deployments should set an access token or a demo budget, enable proxy-header trust only behind a proxy you control, and choose PAPER_CONTENT_MODE deliberately because arXiv full-text redistribution has policy boundaries.',
          ],
        },
      ],
    },
    zh: {
      metaTitle: 'CiteDuo 文档与自托管 | CiteDuo',
      description:
        '用 Bun、SQLite、Docker 与 Nginx 自托管 CiteDuo，了解配置项、隐私边界和部署要点。',
      eyebrow: '文档 · 部署与运维 CiteDuo',
      h1: 'CiteDuo 文档与自托管',
      lead:
        '在自己的机器上运行一个 Bun 进程和一个 SQLite 文件，或部署到 Nginx 后面。这里只讲可核实的部署事实和边界。',
      sections: [
        {
          heading: '从可核实的部署事实出发',
          paragraphs: [
            'CiteDuo 以单个 Bun 进程和单个 SQLite 数据库运行。Docker 更方便，但源码方式同样受支持；上游 API Key 是可选项，主要用于改善限流。',
            '公开部署应设置访问口令或 Demo 预算，只在自己控制的反向代理后面信任转发头，并谨慎选择 PAPER_CONTENT_MODE，因为 arXiv 全文分发有明确的条款边界。',
          ],
        },
      ],
    },
  },
}

export function categoryPath(category: ArticleCategory, locale: SiteLocale): string {
  return `${locale === 'zh' ? '/zh' : ''}/${category}/`
}

import { buildAppHomeUrl, buildAppPairUrl, SITE_FACTS } from '../facts'
import type { SiteArticleSpec } from '../types'

const [pairSamPi0, pairAlohaRdt, pairOpenvlaRt2] = SITE_FACTS.examplePairs

const FAQ = {
  howToCheck: {
    en: [
      {
        question: 'Are two papers related if one cites the other?',
        answer:
          'Often yes, but the citation context matters. A direct citation is the strongest structural signal; read the citing paragraph to see whether it is supportive, contrastive, or a passing mention.',
      },
      {
        question: 'What if neither paper cites the other?',
        answer:
          'Check bibliographic coupling, co-citation, and short bridge paths through intermediate papers. Embedding similarity is the weakest signal and should not be presented as a citation.',
      },
      {
        question: 'What is the difference between bibliographic coupling and co-citation?',
        answer:
          'Coupling means both papers cite the same earlier work. Co-citation means a later paper cites both. Coupling is fixed at publication; co-citation grows over time.',
      },
      {
        question: 'Can CiteDuo prove that two papers are unrelated?',
        answer:
          'No. Missing edges can come from incomplete upstream metadata or a bounded live search. Treat a negative result as inconclusive, not as proof of no relationship.',
      },
    ],
    zh: [
      {
        question: '一篇论文引用另一篇，就一定相关吗？',
        answer:
          '通常是一个强信号，但还要看引用语境。直接引用只能证明“提到了”，仍需阅读施引段落判断是支持、反驳还是顺带提及。',
      },
      {
        question: '两篇论文没有直接引用，还能判断关系吗？',
        answer:
          '可以继续检查文献耦合、共被引和短桥梁路径。语义相似是最后的弱信号，不能当成引用关系。',
      },
      {
        question: '文献耦合和共被引有什么区别？',
        answer:
          '文献耦合是两篇论文共同引用同一批早期工作；共被引是后来的论文同时引用它们。前者发表时基本固定，后者会随时间增长。',
      },
      {
        question: 'CiteDuo 能证明两篇论文无关吗？',
        answer:
          '不能。上游元数据缺失或有界检索未命中都可能造成假阴性。没有找到路径只代表本次检索未命中，不是无关证明。',
      },
    ],
  },
  citationPath: {
    en: [
      {
        question: 'What is a citation path?',
        answer:
          'A citation path is a directed chain of references or citations between two papers. It shows how an idea travelled through intermediate work, not merely that the endpoints share a topic.',
      },
      {
        question: 'When is bibliographic coupling more useful?',
        answer:
          'Use coupling for new papers with few incoming citations. Their bibliography is already complete, so shared references can reveal a common methodological foundation immediately.',
      },
      {
        question: 'When is co-citation more useful?',
        answer:
          'Use co-citation when you want to know whether later papers treat two works as peers, competing baselines, or parts of the same research conversation.',
      },
      {
        question: 'Is semantic similarity the same as a citation?',
        answer:
          'No. Semantic similarity measures abstract or embedding proximity. CiteDuo labels it separately and gives it a lower confidence score than citation-backed evidence.',
      },
    ],
    zh: [
      {
        question: '什么是引用链路？',
        answer:
          '引用链路是两篇论文之间由参考文献或施引关系构成的有向链条，用来说明一个想法如何经过中间工作传递，而不只是说明主题相近。',
      },
      {
        question: '什么时候更适合看文献耦合？',
        answer:
          '新论文被引很少时更适合看文献耦合。它的参考文献列表已经完整，共同引用能立即暴露两篇论文共享的方法论底座。',
      },
      {
        question: '什么时候更适合看共被引？',
        answer:
          '当你想知道后续研究是否把两篇论文当作同类基线、竞争路线或同一场讨论的一部分时，共被引更有解释力。',
      },
      {
        question: '语义相似等于引用关系吗？',
        answer:
          '不等于。语义相似衡量摘要或向量表征的接近程度，CiteDuo 会单独标注，并给出低于引用证据的置信度。',
      },
    ],
  },
  inciteful: {
    en: [
      {
        question: 'Is CiteDuo a replacement for Inciteful?',
        answer:
          'No. Both can connect two papers, but they optimize for different workflows. Inciteful is strong for hosted corpus filtering; CiteDuo focuses on typed evidence, hop-by-hop explanations, graphs, and self-hosting.',
      },
      {
        question: 'Which tool is better for filtering large paper tables?',
        answer:
          'Inciteful is the more natural fit when you want an instant hosted interface for slicing and filtering large citation tables.',
      },
      {
        question: 'Which tool explains each hop?',
        answer:
          'CiteDuo labels each hop as a direct reference, citation, coupling, related-work, or semantic edge, and explains the route in plain language.',
      },
      {
        question: 'Can I self-host CiteDuo?',
        answer:
          'Yes. CiteDuo is MIT-licensed and runs as one Bun process with one SQLite file. Docker and Nginx deployment are documented in the repository.',
      },
    ],
    zh: [
      {
        question: 'CiteDuo 能替代 Inciteful 吗？',
        answer:
          '不能简单替代。两者都能连接两篇论文，但优化的工作流不同：Inciteful 擅长在线语料筛选，CiteDuo 侧重证据类型、逐跳解释、图谱和自托管。',
      },
      {
        question: '哪款工具更适合筛选大规模论文表？',
        answer:
          '如果你希望零安装、直接在网页端对大量引文表做多条件筛选，Inciteful 更自然。',
      },
      {
        question: '哪款工具会解释每一跳？',
        answer:
          'CiteDuo 会把每一跳标成直接参考文献、施引、文献耦合、推荐关联或语义边，并用自然语言解释整条路径。',
      },
      {
        question: 'CiteDuo 可以自托管吗？',
        answer:
          '可以。CiteDuo 采用 MIT 许可证，单个 Bun 进程加单个 SQLite 文件即可运行，仓库里有 Docker 和 Nginx 部署说明。',
      },
    ],
  },
  connectedPapers: {
    en: [
      {
        question: 'What is the best Connected Papers alternative?',
        answer:
          'It depends on the workflow. ResearchRabbit and Litmaps fit cloud collections and alerts; Inciteful fits hosted corpus filtering; CiteDuo fits typed two-paper paths and self-hosted ownership.',
      },
      {
        question: 'Does CiteDuo replace Connected Papers?',
        answer:
          'No. Connected Papers is centered on similarity neighbourhoods around one seed paper. CiteDuo also draws neighbourhoods, but its main focus is explaining how two specific papers connect.',
      },
      {
        question: 'Which alternative supports two-paper paths?',
        answer:
          'CiteDuo and Inciteful Literature Connector both support connecting two papers. They differ in path explanation, filtering, graphs, and deployment model.',
      },
      {
        question: 'Is CiteDuo free?',
        answer:
          'Yes. CiteDuo is MIT-licensed and can be self-hosted without an account. The public demo may have a daily visitor/request budget.',
      },
    ],
    zh: [
      {
        question: '最好的 Connected Papers 替代工具是哪个？',
        answer:
          '取决于工作流。云端收藏和提醒可以看 ResearchRabbit、Litmaps；在线语料筛选可以看 Inciteful；需要证据类型、双论文路径和自托管时看 CiteDuo。',
      },
      {
        question: 'CiteDuo 能替代 Connected Papers 吗？',
        answer:
          '不能简单替代。Connected Papers 以单篇种子论文的相似邻域为中心；CiteDuo 也画邻域，但重点是解释两篇指定论文如何相连。',
      },
      {
        question: '哪些替代工具支持双论文路径？',
        answer:
          'CiteDuo 和 Inciteful Literature Connector 都支持连接两篇论文，区别在路径解释、筛选、图谱和部署方式。',
      },
      {
        question: 'CiteDuo 免费吗？',
        answer:
          '是。CiteDuo 采用 MIT 许可证，可以无账号自托管；公开 Demo 可能有每日访客/请求预算。',
      },
    ],
  },
  literatureReview: {
    en: [
      {
        question: 'How many anchor papers should I start with?',
        answer:
          'Start with two or three papers that represent different assumptions or method families. A single survey often hides the disagreements you need to structure the review.',
      },
      {
        question: 'Should citation count determine paper quality?',
        answer:
          'No. Citation count reflects age and visibility as much as importance. Use it as a navigation signal, then verify the method and claims in the paper.',
      },
      {
        question: 'When should I stop expanding the citation graph?',
        answer:
          'Stop when new expansions no longer change the cluster structure or reveal new bridge papers. Convert the graph into an outline before collecting more PDFs.',
      },
    ],
    zh: [
      {
        question: '文献综述应该从几篇锚点论文开始？',
        answer:
          '先选两到三篇代表不同假设或方法路线的论文。只从一篇综述起步，往往会掩盖真正需要比较的分歧。',
      },
      {
        question: '被引次数能代表论文质量吗？',
        answer:
          '不能。被引次数同时受发表时间和可见度影响。它可以作为导航信号，但结论仍要回到方法和原文核查。',
      },
      {
        question: '什么时候应该停止扩图？',
        answer:
          '当新的扩展不再改变主题簇结构，也不再出现新的桥梁论文时，就应该把图谱转成提纲，而不是继续囤积 PDF。',
      },
    ],
  },
  selfHosting: {
    en: [
      {
        question: 'What do I need to self-host CiteDuo?',
        answer:
          'You need Bun 1.3 or newer and a writable data directory for SQLite. Docker is optional, and upstream API keys are optional for basic use.',
      },
      {
        question: 'Does self-hosting require an account?',
        answer:
          'No. CiteDuo runs locally without an account or cloud workspace. Optional LLM and API-key features are configured through environment variables.',
      },
      {
        question: 'Can I put CiteDuo behind Nginx?',
        answer:
          'Yes. The repository includes a deployment guide for Nginx, TLS, sub-path mounting, systemd, and health checks.',
      },
    ],
    zh: [
      {
        question: '自托管 CiteDuo 需要什么？',
        answer:
          '需要 Bun 1.3 或更新版本，以及一个可写的 SQLite 数据目录。Docker 可选，基础使用不强制配置上游 API Key。',
      },
      {
        question: '自托管需要账号吗？',
        answer:
          '不需要。CiteDuo 可以在本地无账号运行，可选的 LLM 与 API Key 功能通过环境变量配置。',
      },
      {
        question: '可以把 CiteDuo 放在 Nginx 后面吗？',
        answer:
          '可以。仓库提供 Nginx、TLS、子路径挂载、systemd 和健康检查的部署说明。',
      },
    ],
  },
}

const HOW_TO_CHECK = {
  en: {
    name: 'How to check whether two papers are related',
    steps: [
      {
        name: 'Check direct citations in both directions',
        text: 'Look for A in B’s references or B in A’s references. A direct citation is the strongest structural signal, but the citing paragraph still determines whether it is supportive or contrastive.',
      },
      {
        name: 'Compare shared references',
        text: 'If neither paper cites the other, list their shared references. Bibliographic coupling is strongest when they share specific domain papers, not only ubiquitous classics.',
      },
      {
        name: 'Check co-citation',
        text: 'Look for later papers that cite both. Co-citation shows that the research community discusses them together, but it is weaker than a direct citation.',
      },
      {
        name: 'Inspect short bridge paths',
        text: 'Search for short paths through intermediate papers. Read the bridge paper to see whether it is a genuine methodological link or a generic survey.',
      },
      {
        name: 'Verify the source text',
        text: 'Open the citing paragraph before making a claim. Citation metadata shows that a link exists, not what the author meant by it.',
      },
    ],
  },
  zh: {
    name: '如何判断两篇论文是否相关',
    steps: [
      {
        name: '双向检查直接引用',
        text: '检查 B 的参考文献是否列出 A，或 A 是否列出 B。直接引用是最强的结构信号，但仍要读施引段落判断是支持还是反驳。',
      },
      {
        name: '比较共同参考文献',
        text: '如果双方没有直接引用，列出共同参考文献。共享具体领域论文比只共享泛用经典更能说明文献耦合。',
      },
      {
        name: '检查共被引',
        text: '寻找同时引用两者的后续论文。共被引说明学界把它们放在一起讨论，但证据强度低于直接引用。',
      },
      {
        name: '检查短桥梁路径',
        text: '搜索经过中间论文的短路径。打开桥梁论文，判断它是真正的方法连接，还是泛泛的综述节点。',
      },
      {
        name: '核对原文语境',
        text: '下结论前打开施引段落。引文元数据只能证明“提到了”，不能说明作者的实际态度。',
      },
    ],
  },
}

export const SITE_ARTICLES: SiteArticleSpec[] = [
  {
    id: 'how-to-check-if-two-papers-are-related',
    category: 'guides',
    slug: 'how-to-check-if-two-papers-are-related',
    publishedAt: '2026-11-19',
    updatedAt: SITE_FACTS.lastUpdated,
    relatedIds: [
      'citation-path-vs-bibliographic-coupling-vs-co-citation',
      'how-to-use-citation-networks-in-a-literature-review',
      'connected-papers-alternatives',
    ],
    en: {
      title: 'How to Check If Two Research Papers Are Related',
      metaTitle: 'How to Check If Two Papers Are Related | CiteDuo',
      description:
        'Check direct citations, bibliographic coupling, co-citation, and semantic bridges to decide whether two papers are genuinely related.',
      eyebrow: 'Guide · Literature Verification',
      summaryAnswer:
        'To check whether two papers are genuinely related, test four signals in decreasing order of evidence strength: (1) direct citation in either direction, (2) bibliographic coupling via shared references, (3) co-citation by later papers that compare or combine them, and (4) multi-hop bridge papers or embedding similarity when vocabulary differs.',
      ctaLabel: 'Try with two example papers',
      ctaHref: buildAppPairUrl(pairSamPi0),
      secondaryCtaLabel: 'Open paper workspace',
      secondaryCtaHref: buildAppHomeUrl('guide_two_papers_en'),
      faq: FAQ.howToCheck.en,
      howTo: HOW_TO_CHECK.en,
      sections: [
        {
          heading: 'Why keyword overlap and single-paper graphs often miss the real answer',
          paragraphs: [
            'When two papers sit open in your browser tabs, searching a keyword database rarely tells you how one influenced the other. Two subfields often describe the same mathematical idea with different terminology, while two papers with nearly identical titles may share zero methodological lineage.',
            'Single-seed citation graphs help you browse around one paper, but if Paper B falls outside the top-N rendered nodes of Paper A, its absence from the diagram does not mean the two works are unrelated.',
          ],
        },
        {
          heading: 'Step-by-step checklist: four levels of connection evidence',
          paragraphs: [
            'Not every line between two nodes carries the same scientific weight. Checking evidence from strongest to weakest prevents over-claiming in a literature review:',
          ],
          table: {
            headers: ['Evidence level', 'What it means', 'How CiteDuo scores base hop confidence'],
            rows: [
              ['1. Direct reference / citation', 'Paper B explicitly cites Paper A (or vice versa).', '1.00 (reference list) / 0.95 (citing list)'],
              ['2. Bibliographic coupling', 'Both papers build on the same earlier foundational work.', '0.80 base (scaled up by shared reference count)'],
              ['3. Co-citation', 'A later paper cites both A and B in the same discussion.', 'Two directed citation hops leaving the shared citer'],
              ['4. Recommender / SPECTER2 similarity', 'Abstracts or citation neighbourhoods look close without a citation link.', '0.60 (related) / 0.45 (SPECTER2 embedding)'],
            ],
          },
        },
        {
          heading: 'Inspecting alternative paths separates structural bridges from coincidences',
          paragraphs: [
            'Two machine-learning papers might both cite a ubiquitous paper like ResNet or Attention Is All You Need. A single shared mega-classic is weak evidence that two specific methods belong to the same sub-lineage.',
            `CiteDuo searches up to ${SITE_FACTS.searchLimits.maxHops} hops and returns up to ${SITE_FACTS.searchLimits.maxPaths} distinct paths by blocking interior bridge nodes. When you see both a specific domain ancestor (for example, RT-1 or CLIP) and a citing survey paper, the connection is structurally robust.`,
          ],
        },
        {
          heading: 'When automated connection search is not enough',
          paragraphs: [
            'Citation metadata never tells you whether a citation is supportive, contrastive, or a passing background mention. After identifying a bridge paper, always read the citing paragraph before citing the relationship in your own manuscript.',
            'Upstream APIs can also miss newly posted preprints or incomplete reference lists. If a live query reports upstream rate-limiting, check local cache status or configure a free Semantic Scholar API key.',
          ],
        },
      ],
      sources: [
        { label: 'Semantic Scholar Academic Graph API Documentation', url: 'https://api.semanticscholar.org/api-docs/' },
        { label: 'OpenAlex Works & Citation Metadata Documentation', url: 'https://docs.openalex.org/api-entities/works' },
        { label: 'CiteDuo Open-Source Pathfinding Implementation (server/pathfind.ts)', url: 'https://github.com/benbenlijie/citeduo/blob/main/server/pathfind.ts' },
      ],
    },
    zh: {
      title: '如何判断两篇学术论文是否真正相关',
      metaTitle: '如何判断两篇论文是否相关 | CiteDuo',
      description:
        '按直接引用、文献耦合、共被引、多跳桥梁与语义相似逐级核查两篇论文的真实关系，避免把标题相近误判为方法同源。',
      eyebrow: '方法指南 · 文献关系核验',
      summaryAnswer:
        '判断两篇论文是否真正相关，最稳妥的做法是按证据从强到弱依次核查四类信号：（1）是否存在单向或双向直接引用；（2）是否共同引用同一批核心前驱文献（文献耦合）；（3）是否被后续综述或改进工作同时引用（共被引）；（4）跨术语体系时是否存在多跳桥梁论文或向量语义近邻。',
      ctaLabel: '用两篇示例论文体验',
      ctaHref: buildAppPairUrl(pairSamPi0),
      secondaryCtaLabel: '打开论文工作台',
      secondaryCtaHref: buildAppHomeUrl('guide_two_papers_zh'),
      faq: FAQ.howToCheck.zh,
      howTo: HOW_TO_CHECK.zh,
      sections: [
        {
          heading: '为什么关键词搜索和单中心引文图常常答不出“这两篇怎么连上”',
          paragraphs: [
            '写论文或读论文时，最常见的场景不是“一无所知地漫游”，而是浏览器里已经打开了 A 和 B 两篇论文，你想知道 B 是不是从 A 演进来的、或者它们为什么给出相反的实验结论。不同子领域常常用不同术语描述同一种结构，纯关键词检索很容易漏掉关联。',
            '传统单中心引文图围绕单篇种子论文取前几十个邻居节点。如果论文 B 恰好排在第 120 名之外，图上没出现并不代表两篇论文毫无关系。',
          ],
        },
        {
          heading: '四级证据核查清单：不要把所有连线当成同一种关系',
          paragraphs: [
            '两篇论文之间“有一条线”并不是答案，线的证据类型才决定你在文献综述里该怎么下笔：',
          ],
          table: {
            headers: ['证据层级', '学术含义', 'CiteDuo 单跳基础置信度'],
            rows: [
              ['1. 直接引用（Reference / Citation）', 'B 的参考文献直接列出了 A（或反向）。', '1.00（参考文献表） / 0.95（施引列表）'],
              ['2. 文献耦合（Bibliographic Coupling）', 'A 和 B 共同建立在同一批早期奠基工作之上。', '0.80 基础分（随共同引用数量对数上调）'],
              ['3. 共被引（Co-citation）', '后来的论文 C 把 A 与 B 放在一起对比或结合。', '由同一施引节点发出的两跳有向引用构成'],
              ['4. 推荐关联 / SPECTER2 语义近邻', '尚无显式引用链，但摘要表征或推荐邻域高度接近。', '0.60（推荐边） / 0.45（SPECTER2 向量）'],
            ],
          },
        },
        {
          heading: '看备选路径：区分“巧合共引大路货”与“真正的方法同源”',
          paragraphs: [
            '两篇深度学习论文都引用了 ResNet 或 Transformer，并不代表它们在具体问题上真正同源。只有看清中间桥梁究竟是泛用基础论文还是细分领域关键工作，结论才可靠。',
            `CiteDuo 在最多 ${SITE_FACTS.searchLimits.maxHops} 跳内执行双向广度优先搜索，并通过屏蔽首条路径的中间节点，最多给出 ${SITE_FACTS.searchLimits.maxPaths} 条结构不同的备选路径，帮助你一眼分辨偶然重合与稳固脉络。`,
          ],
        },
        {
          heading: '自动路径检索的边界：最后一步仍需回到正文语境',
          paragraphs: [
            '引文元数据只能证明“提到了”，不能证明“赞同”还是“反驳”。找到关键桥梁论文后，务必点开对应章节核对引文上下文。',
            '此外，最新预印本可能尚未被上游引文索引完整解析；当遇到上游接口限流提示时，可在本地配置免费 Semantic Scholar API Key 以获得更稳定的实时扩展能力。',
          ],
        },
      ],
      sources: [
        { label: 'Semantic Scholar 学术图谱 API 文档', url: 'https://api.semanticscholar.org/api-docs/' },
        { label: 'OpenAlex Works 实体与引文结构说明', url: 'https://docs.openalex.org/api-entities/works' },
        { label: 'CiteDuo 路径搜索与评分源码（server/pathfind.ts）', url: 'https://github.com/benbenlijie/citeduo/blob/main/server/pathfind.ts' },
      ],
    },
  },
  {
    id: 'citation-path-vs-bibliographic-coupling-vs-co-citation',
    category: 'guides',
    slug: 'citation-path-vs-bibliographic-coupling-vs-co-citation',
    publishedAt: '2026-11-19',
    updatedAt: SITE_FACTS.lastUpdated,
    relatedIds: [
      'how-to-check-if-two-papers-are-related',
      'citeduo-vs-inciteful-literature-connector',
      'how-to-use-citation-networks-in-a-literature-review',
    ],
    en: {
      title: 'Citation Path vs Bibliographic Coupling vs Co-citation Explained',
      metaTitle: 'Citation Path vs Coupling vs Co-citation | CiteDuo',
      description:
        'Compare directed citation paths, bibliographic coupling, and co-citation: what each measures, when it works, and where it fails.',
      eyebrow: 'Methodology · Scientometrics in Practice',
      summaryAnswer:
        'A citation path traces directed chronological inheritance (A → M → B), bibliographic coupling measures shared references fixed at publication time (A → R ← B), and co-citation measures how later authors group two papers together over time (A ← C → B). Use coupling for brand-new papers with zero citations, co-citation for field consensus, and directed paths for idea transmission.',
      ctaLabel: 'Inspect a 2-hop coupling example',
      ctaHref: buildAppPairUrl(pairAlohaRdt),
      secondaryCtaLabel: 'Inspect a 1-hop direct citation',
      secondaryCtaHref: buildAppPairUrl(pairOpenvlaRt2),
      faq: FAQ.citationPath.en,
      sections: [
        {
          heading: 'Three graph shapes, three completely different claims',
          paragraphs: [
            'Many visual graph tools flatten citation structures into undirected similarity edges. That makes layouts tidy, but it hides arrow direction — which is the difference between a shared ancestor and a shared descendant.',
          ],
          table: {
            headers: ['Relation type', 'Arrow pattern', 'Changes over time?', 'Best question it answers'],
            rows: [
              ['Directed citation path', 'A ← M ← B (or A → M → B)', 'Grows as intermediate bridges appear', 'How did an idea travel from an earlier lineage into a newer one?'],
              ['Bibliographic coupling (Kessler, 1963)', 'A → R ← B (both cite R)', 'Static once A and B are published', 'Do two recent papers build on the same intellectual foundation?'],
              ['Co-citation (Small, 1973)', 'A ← C → B (C cites both)', 'Evolves as new papers cite them together', 'Does the research community treat these two works as peers or baselines?'],
            ],
          },
        },
        {
          heading: 'Why new preprints need bibliographic coupling, while classics benefit from co-citation',
          paragraphs: [
            'A paper posted on arXiv last week has zero incoming citations, so co-citation is mathematically zero even if it directly extends a well-known subfield. Its bibliography, however, is already complete — making bibliographic coupling immediately informative.',
            'Conversely, two foundational papers from different decades might cite completely different eras of literature, yet hundreds of modern papers cite both together. Co-citation captures that community-recognized synthesis.',
          ],
        },
        {
          heading: 'How CiteDuo classifies and ranks mixed-edge paths',
          paragraphs: [
            'In CiteDuo, server/pathfind.ts classifies every discovered route by arrow geometry rather than a generic tag. Two citation-backed steps converging on a shared reference are labelled Bibliographic Coupling; two steps diverging from a shared citing work are labelled Co-citation.',
            'Each path is scored with ((averageConfidence + weakestHopConfidence) / 2) × 100 / (hops + 1). Including the weakest hop prevents one low-confidence embedding bridge from hiding inside a chain of strong citations.',
          ],
        },
      ],
      sources: [
        { label: 'Kessler, M. M. (1963). Bibliographic coupling between scientific papers. American Documentation.', url: 'https://doi.org/10.1002/asi.5090140103' },
        { label: 'Small, H. (1973). Co-citation in the scientific literature. JASIS.', url: 'https://doi.org/10.1002/asi.4630240406' },
        { label: 'CiteDuo Shape-Based Path Classifier (server/pathfind.ts)', url: 'https://github.com/benbenlijie/citeduo/blob/main/server/pathfind.ts' },
      ],
    },
    zh: {
      title: '引用链路、文献耦合与共被引有什么区别？一文讲清三种文献关联',
      metaTitle: '引用链路 vs 文献耦合 vs 共被引 | CiteDuo',
      description:
        '用箭头结构讲清有向引用链、文献耦合与共被引的区别、时间特性和适用场景，避免把相似度连线误当成引用。',
      eyebrow: '科学计量方法 · 图谱原理解析',
      summaryAnswer:
        '有向引用链刻画思想按时间的传递（A ← M ← B）；文献耦合看两篇论文是否共同引用同一批前人文献（A → R ← B），发表即固定，最适合零被引新论文；共被引看后续论文是否同时把两者放在一起讨论（A ← C → B），随时间演化，最适合观察学界共识。',
      ctaLabel: '查看 2 跳文献耦合真实案例',
      ctaHref: buildAppPairUrl(pairAlohaRdt),
      secondaryCtaLabel: '查看 1 跳直接引用真实案例',
      secondaryCtaHref: buildAppPairUrl(pairOpenvlaRt2),
      faq: FAQ.citationPath.zh,
      sections: [
        {
          heading: '三种箭头方向，代表三种截然不同的学术判断',
          paragraphs: [
            '不少可视化工具为了排版美观，把文献关系合并成没有方向的“相似度连线”。一旦丢掉箭头方向，“共同继承同一个前辈”和“共同启发同一个后辈”就会混为一谈。',
          ],
          table: {
            headers: ['关系类型', '箭头拓扑结构', '随时间变化吗？', '最适合回答什么问题'],
            rows: [
              ['有向引用链（Citation Path）', 'A ← M ← B（经中间论文传递）', '随中间过渡工作发表而补充', '一个早期方法是如何一步步演进到新方向里的？'],
              ['文献耦合（Kessler, 1963）', 'A → R ← B（两者共同引用 R）', '发表瞬间即固定不变', '两篇刚挂上 arXiv 的新工作是否共享同一套方法底座？'],
              ['共被引（Small, 1973）', 'A ← C → B（后继论文 C 同时引用两者）', '随学界后续引用持续演化', '学术共同体是否经常把这两篇论文当作基线并列比较？'],
            ],
          },
        },
        {
          heading: '为什么读最新预印本要看“文献耦合”，读经典基线要看“共被引”',
          paragraphs: [
            '上周刚发布的预印本被引次数往往是 0，任何纯靠共被引的算法都会失效；但它的参考文献列表已经完整存在，因此文献耦合能立刻定位它与已有工作的共同源头。',
            '反过来，两篇相隔十年的奠基性论文各自引用的时代背景不同，直接耦合可能很弱，但今天上百篇综述和实验论文都会同时引用它们——这时共被引更能反映学界认知的关联。',
          ],
        },
        {
          heading: 'CiteDuo 如何对混合证据路径做形状分类与最弱跳评分',
          paragraphs: [
            'CiteDuo 的路径分类器（server/pathfind.ts）严格根据有向边方向判定类型：两跳引用汇聚到同一篇被引用文献时标为“文献耦合”，从同一篇施引文献分叉出去时标为“共被引”，绝不把共享参考文献误写成“直接引用”。',
            '路径总分按 ((平均置信度 + 最弱跳置信度) / 2) × 100 / (跳数 + 1) 计算。引入“最弱跳”项的目的很明确：一条链路的可靠性取决于最薄弱的一环，不能让几条强引用掩盖中间一段牵强的语义猜测。',
          ],
        },
      ],
      sources: [
        { label: 'Kessler, M. M. (1963). Bibliographic coupling between scientific papers.', url: 'https://doi.org/10.1002/asi.5090140103' },
        { label: 'Small, H. (1973). Co-citation in the scientific literature.', url: 'https://doi.org/10.1002/asi.4630240406' },
        { label: 'CiteDuo 路径分类与评分实现（server/pathfind.ts）', url: 'https://github.com/benbenlijie/citeduo/blob/main/server/pathfind.ts' },
      ],
    },
  },
  {
    id: 'citeduo-vs-inciteful-literature-connector',
    category: 'compare',
    slug: 'citeduo-vs-inciteful-literature-connector',
    publishedAt: '2026-11-19',
    updatedAt: SITE_FACTS.lastUpdated,
    relatedIds: [
      'connected-papers-alternatives',
      'how-to-check-if-two-papers-are-related',
      'self-hosting-citeduo',
    ],
    en: {
      title: 'CiteDuo vs Inciteful Literature Connector: Honest Comparison',
      metaTitle: 'CiteDuo vs Inciteful Literature Connector',
      description:
        'Compare CiteDuo and Inciteful Literature Connector on two-paper path search, evidence typing, graphs, reading, and self-hosting.',
      eyebrow: 'Comparison · Two-Paper Connectors',
      summaryAnswer:
        'Both CiteDuo and Inciteful Literature Connector find paths between two academic papers — CiteDuo is not the only tool that connects two papers. Choose Inciteful when you want an instant zero-install web service with advanced SQL-like OpenAlex filtering over large corpus tables; choose CiteDuo when you want hop-by-hop typed evidence explanations (direct vs coupling vs co-citation vs semantic), interactive 2D/3D neighbourhood graphs, in-app arXiv bilingual reading, or MIT-licensed local self-hosting.',
      ctaLabel: 'Try CiteDuo two-paper path',
      ctaHref: buildAppPairUrl(pairSamPi0),
      secondaryCtaLabel: 'View CiteDuo source on GitHub',
      secondaryCtaHref: SITE_FACTS.githubRepoUrl,
      faq: FAQ.inciteful.en,
      sections: [
        {
          heading: 'What both tools do well',
          paragraphs: [
            'Inciteful pioneered an accessible web workflow for connecting two papers ("Literature Connector") on top of open scholarly graph data. Researchers have used it for years to bridge interdisciplinary topics without paying subscription fees.',
            'CiteDuo addresses the same core researcher question ("how do Paper A and Paper B connect?") while combining interactive citation-graph exploration, explicit per-hop evidence typing, and a self-hosted local SQLite architecture.',
          ],
        },
        {
          heading: 'Side-by-side feature & architecture comparison',
          paragraphs: [
            'The table below summarizes verifiable architectural and workflow differences as of November 2026:',
          ],
          table: {
            headers: ['Dimension', 'Inciteful (Literature Connector)', 'CiteDuo'],
            rows: [
              ['Connects two specific papers', 'Yes — shortest undirected citation paths between two works', 'Yes — ranked paths up to 6 hops with up to 3 structural alternatives'],
              ['Edge types in path search', 'Citation graph links (OpenAlex / scholarly citation graph)', 'Typed & weighted: reference (1.0), citation (0.95), coupling (0.8), related (0.6), SPECTER2 semantic (0.45)'],
              ['Per-hop prose explanation', 'Graph & paper tables along connecting paths', 'Plain-language sentence per hop + badge (Direct, Coupling, Co-citation, Citation Path, Semantic)'],
              ['Interactive neighbourhood graph', 'Focused primarily on ranked tables & connector graph', 'Full 2D/3D force graph, Louvain topic clusters, timeline playback, side-by-side compare'],
              ['In-app reading & translation', 'Links out to publisher / DOI', 'Built-in arXiv/ar5iv reader + optional paragraph bilingual translation'],
              ['Self-hosting & data ownership', 'Hosted web application', 'MIT-licensed open source; single Bun process + local SQLite file (Docker supported)'],
            ],
          },
        },
        {
          heading: 'When Inciteful is the better choice',
          paragraphs: [
            'If you want to slice large sets of citing papers with custom bibliographic filters, export filtered corpus tables immediately in a hosted browser app without worrying about demo rate budgets or local setup, Inciteful remains fast and effective.',
          ],
        },
        {
          heading: 'When CiteDuo is the better choice',
          paragraphs: [
            'Pick CiteDuo when you want to see whether a two-paper link is a true citation chain versus bibliographic coupling or semantic similarity, when you want to pivot smoothly from a path node into its surrounding Louvain cluster graph and arXiv text, or when you prefer keeping your reading notes and cached graphs in a local SQLite file.',
          ],
        },
      ],
      sources: [
        { label: 'Inciteful Official Site & Literature Connector', url: 'https://inciteful.xyz/' },
        { label: 'CiteDuo GitHub Repository (MIT License)', url: 'https://github.com/benbenlijie/citeduo' },
      ],
    },
    zh: {
      title: 'CiteDuo 与 Inciteful Literature Connector 客观对比',
      metaTitle: 'CiteDuo vs Inciteful 文献连接器对比',
      description:
        '客观对比 CiteDuo 与 Inciteful Literature Connector 在双论文路径、证据解释、图谱、阅读与自托管上的差异。',
      eyebrow: '工具对比 · 双论文关联分析',
      summaryAnswer:
        'Inciteful 的 Literature Connector 同样支持连接两篇论文——CiteDuo 并不是唯一能连接两篇论文的工具。如果你希望免安装直接在网页端对大规模开放引文表做灵活筛选，Inciteful 非常成熟；如果你需要逐跳区分证据类型（直接引用、文献耦合、共被引、语义相似）、在同一工作台切换 2D/3D 聚类网络与 arXiv 双语阅读，或者需要 MIT 开源本地自托管，CiteDuo 更合适。',
      ctaLabel: '体验 CiteDuo 双论文关联分析',
      ctaHref: buildAppPairUrl(pairSamPi0),
      secondaryCtaLabel: '查看 GitHub 开源仓库',
      secondaryCtaHref: SITE_FACTS.githubRepoUrl,
      faq: FAQ.inciteful.zh,
      sections: [
        {
          heading: '两款工具的共同出发点',
          paragraphs: [
            'Inciteful 很早就推出了备受好评的 Literature Connector（文献连接器），利用开放学术图谱帮助研究者寻找两篇论文之间的中间文献，无需付费订阅。',
            'CiteDuo 同样聚焦“两篇论文如何相连”，但进一步把逐跳证据定性、交互式主题聚类图谱、应用内 arXiv 阅读翻译和单文件本地优先存储整合进了同一个开源工作台。',
          ],
        },
        {
          heading: '核心能力与架构对照表',
          paragraphs: [
            '以下按可核实的产品形态与公开代码事实进行对比（截至 2026 年 11 月）：',
          ],
          table: {
            headers: ['对比维度', 'Inciteful Literature Connector', 'CiteDuo'],
            rows: [
              ['连接两篇指定论文', '支持——检索两篇论文之间的引文连接路径', '支持——最多 6 跳双向检索，返回最多 3 条结构不同的备选路径'],
              ['路径边证据建模', '基于开放引文图谱的引用关系', '区分 5 类边置信度：直接参考文献(1.0)、施引(0.95)、文献耦合(0.8)、推荐(0.6)、SPECTER2 语义(0.45)'],
              ['逐跳文字解释', '以路径图与文献统计列表展示为主', '逐跳生成自然语言解释，并标注直接引用 / 文献耦合 / 共被引 / 引用链路 / 语义相似徽章'],
              ['邻域聚类可视化', '以表格筛选与连接视图为主', '支持 2D/3D 力导向图、Louvain 主题簇命名、年份时间轴回放与分屏对比'],
              ['原文阅读与翻译', '跳转外部出版商或 DOI 页面', '内置 arXiv / ar5iv 章节阅读器与可选段落级双语对照翻译'],
              ['部署方式与数据归属', '在线托管 Web 服务', 'MIT 许可证开源；单 Bun 进程 + 本地 SQLite 文件，支持 Docker 一键自托管'],
            ],
          },
        },
        {
          heading: '什么时候更推荐用 Inciteful',
          paragraphs: [
            '如果你希望零配置直接在云端对大批量施引/被引文献做多条件列表过滤，且不需要本地落盘或应用内阅读器，Inciteful 依然是非常高效的在线工具。',
          ],
        },
        {
          heading: '什么时候更推荐用 CiteDuo',
          paragraphs: [
            '当你想一眼看清两篇论文究竟是“真引用”还是“仅共享参考文献 / 摘要相似”、想在找到桥梁论文后顺手展开它的聚类邻域并对照阅读 arXiv 原文，或者希望所有检索缓存、收藏和笔记完全保存在自己电脑上时，CiteDuo 更契合。',
          ],
        },
      ],
      sources: [
        { label: 'Inciteful 官方网站与 Literature Connector', url: 'https://inciteful.xyz/' },
        { label: 'CiteDuo GitHub 开源仓库（MIT 许可证）', url: 'https://github.com/benbenlijie/citeduo' },
      ],
    },
  },
  {
    id: 'connected-papers-alternatives',
    category: 'compare',
    slug: 'connected-papers-alternatives',
    publishedAt: '2026-11-19',
    updatedAt: SITE_FACTS.lastUpdated,
    relatedIds: [
      'citeduo-vs-inciteful-literature-connector',
      'how-to-check-if-two-papers-are-related',
      'how-to-use-citation-networks-in-a-literature-review',
    ],
    en: {
      title: 'Connected Papers Alternatives in 2026: Cloud & Self-Hosted Options',
      metaTitle: 'Connected Papers Alternatives (2026) | CiteDuo',
      description:
        'Compare Connected Papers alternatives by workflow: cloud collections, alerts, two-paper pathfinding, open-source self-hosting, and data ownership.',
      eyebrow: 'Comparison · Literature Mapping Landscape',
      summaryAnswer:
        'The best Connected Papers alternative depends on your workflow: use ResearchRabbit or Litmaps for cloud collections and new-paper email alerts, Inciteful for hosted corpus filtering and two-paper connector tables, and CiteDuo when you want an MIT-licensed, self-hosted workspace that combines interactive cluster graphs with hop-by-hop two-paper connection explanations.',
      ctaLabel: 'Open CiteDuo workspace',
      ctaHref: buildAppHomeUrl('compare_cp_alternatives_en'),
      secondaryCtaLabel: 'Try two-paper example',
      secondaryCtaHref: buildAppPairUrl(pairSamPi0),
      faq: FAQ.connectedPapers.en,
      sections: [
        {
          heading: 'Why researchers look beyond Connected Papers',
          paragraphs: [
            'Connected Papers popularized clean visual similarity graphs built from co-citation and bibliographic coupling around a single seed paper. Researchers typically look for alternatives when they hit monthly free-graph limits, need multi-seed or two-paper path explanations, want ongoing alerts, or require local data ownership.',
          ],
        },
        {
          heading: 'Comparison of major literature mapping tools',
          paragraphs: [
            'Each tool optimizes for a distinct stage of literature discovery:',
          ],
          table: {
            headers: ['Tool', 'Core strength', 'Two-paper path explanation', 'Pricing / Hosting model'],
            rows: [
              ['Connected Papers', 'Fast single-seed visual similarity map (prior & derivative works)', 'No dedicated hop-by-hop two-paper path solver', 'Freemium SaaS (monthly free graph quota + paid tiers)'],
              ['Litmaps', 'Chronological citation maps, multi-seed maps & email alerts', 'Shows shared links across seeds on map, not prose hop ranking', 'Freemium SaaS'],
              ['ResearchRabbit', 'Collection-based discovery & collaborative cloud folders', 'Collection graph exploration rather than shortest-path explanation', 'Hosted cloud service'],
              ['Inciteful', 'Table-driven OpenAlex filtering + Literature Connector', 'Yes — citation connector paths', 'Free hosted web tool'],
              ['CiteDuo', 'Typed two-paper path explanations + Louvain graph + arXiv reader', 'Yes — ranked hop-by-hop prose with evidence badges & alternatives', 'Open-source (MIT), local/self-hosted + free budgeted demo'],
            ],
          },
        },
        {
          heading: 'How to choose the right tool for your task',
          paragraphs: [
            'Keep Connected Papers when you want a quick one-off visual overview of a single unfamiliar paper with zero setup.',
            'Choose Litmaps or ResearchRabbit if you track an active research topic over months and want automated notifications when new citing papers appear.',
            'Choose CiteDuo when you want unlimited local graph builds with your own free Semantic Scholar / OpenAlex keys, explicit differentiation between citation and similarity edges, and direct arXiv reading in one workspace.',
          ],
        },
      ],
      sources: [
        { label: 'Connected Papers Official Website', url: 'https://www.connectedpapers.com/' },
        { label: 'Litmaps Official Website', url: 'https://www.litmaps.com/' },
        { label: 'ResearchRabbit Official Website', url: 'https://www.researchrabbit.ai/' },
        { label: 'Inciteful Official Website', url: 'https://inciteful.xyz/' },
        { label: 'CiteDuo GitHub Repository', url: 'https://github.com/benbenlijie/citeduo' },
      ],
    },
    zh: {
      title: '2026 常见 Connected Papers 替代工具对比：云端服务与开源自托管怎么选',
      metaTitle: 'Connected Papers 替代工具（2026） | CiteDuo',
      description:
        '按工作流比较 Connected Papers 替代工具：云端收藏、新论文提醒、双论文路径、开源自托管与数据归属。',
      eyebrow: '工具盘点 · 文献图谱生态对比',
      summaryAnswer:
        '没有哪一款工具能在所有环节通吃：快速看单篇论文的相似文献概览可继续用 Connected Papers；需要云端收藏夹和最新论文邮件提醒可选 Litmaps 或 ResearchRabbit；免安装网页端筛表与连接选 Inciteful；如果你需要“不限次本地建图 + 逐跳解释任意两篇论文怎么连上 + arXiv 双语阅读 + MIT 开源自托管”，CiteDuo 是直接对应的选择。',
      ctaLabel: '打开 CiteDuo 论文工作台',
      ctaHref: buildAppHomeUrl('compare_cp_alternatives_zh'),
      secondaryCtaLabel: '体验双论文关联示例',
      secondaryCtaHref: buildAppPairUrl(pairSamPi0),
      faq: FAQ.connectedPapers.zh,
      sections: [
        {
          heading: '研究者通常因为什么原因寻找 Connected Papers 替代方案',
          paragraphs: [
            'Connected Papers 把“围绕一篇种子论文展示共被引与文献耦合相似图”做成了极易上手的体验。但在深入调研时，用户经常会遇到三类新需求：免费额度受限、手头已有两篇论文想查清中间链路，或者希望把调研笔记和图谱留在本地。',
          ],
        },
        {
          heading: '主流文献图谱工具横向对照',
          paragraphs: [
            '下面从核心定位、双论文路径解释能力与托管模式三个维度做客观对照：',
          ],
          table: {
            headers: ['工具名称', '核心强项', '两篇论文逐跳解释能力', '授权与托管形态'],
            rows: [
              ['Connected Papers', '单篇种子论文的相似图谱、先驱工作（Prior）与衍生工作（Derivative）视图', '不支持指定两篇论文输出逐跳路径解释', '商业 SaaS（免费额度 + 订阅制）'],
              ['Litmaps', '时间轴引文排布、多种子叠加与新论文邮件追踪提醒', '可在画布叠加多篇论文，但不做分证据等级的逐跳文字解释', '商业 SaaS（免费版 + 专业版）'],
              ['ResearchRabbit', '基于文献集合的关联推荐与团队云端共享文件夹', '侧重集合扩展推荐，非双端点最短证据链求解', '在线云服务'],
              ['Inciteful', '基于开放图谱的高级表格过滤与 Literature Connector', '支持两篇论文之间的引文连接检索', '免费在线 Web 工具'],
              ['CiteDuo', '分证据等级的双论文路径解释 + Louvain 聚类图 + arXiv 双语阅读', '支持最多 6 跳检索、最弱跳约束评分、逐跳解释与备选路线', 'MIT 开源（支持本地/Docker 自托管 + 预算保护公开体验站）'],
            ],
          },
        },
        {
          heading: '按你的真实科研任务做选择',
          paragraphs: [
            '如果你只是偶尔点开陌生方向的一篇代表作、想 10 秒看一眼周围近似文献，Connected Papers 依然省心。',
            '如果你需要围绕一个课题连续几个月接收新发表论文推送，Litmaps 的时间轴监控更合适。',
            '如果你正在精读多篇论文、需要反复追问“这两篇到底是什么关系”，并且希望配合自己的免费 API Key 在本机无限制建图、做笔记和导出 BibTeX，建议直接使用 CiteDuo。',
          ],
        },
      ],
      sources: [
        { label: 'Connected Papers 官方网站', url: 'https://www.connectedpapers.com/' },
        { label: 'Litmaps 官方网站', url: 'https://www.litmaps.com/' },
        { label: 'ResearchRabbit 官方网站', url: 'https://www.researchrabbit.ai/' },
        { label: 'Inciteful 官方网站', url: 'https://inciteful.xyz/' },
        { label: 'CiteDuo GitHub 开源仓库', url: 'https://github.com/benbenlijie/citeduo' },
      ],
    },
  },
  {
    id: 'how-to-use-citation-networks-in-a-literature-review',
    category: 'guides',
    slug: 'how-to-use-citation-networks-in-a-literature-review',
    publishedAt: '2026-11-19',
    updatedAt: SITE_FACTS.lastUpdated,
    relatedIds: [
      'how-to-check-if-two-papers-are-related',
      'citation-path-vs-bibliographic-coupling-vs-co-citation',
      'connected-papers-alternatives',
    ],
    en: {
      title: 'How to Use Citation Networks in a Literature Review Without Getting Lost',
      metaTitle: 'Citation Networks for Literature Reviews | CiteDuo',
      description:
        'A five-step citation-network workflow for literature reviews: anchor papers, cluster naming, timeline checks, bridge finding, and source verification.',
      eyebrow: 'Workflow · Literature Review',
      summaryAnswer:
        'Use citation networks in five bounded passes: (1) pick 2–3 anchor papers from different angles, (2) map Louvain clusters to name distinct sub-approaches, (3) run backward and forward lineage checks for roots and state-of-the-art, (4) run two-paper path analysis between clusters to find synthesis papers, and (5) verify claims in full text before exporting BibTeX.',
      ctaLabel: 'Enter paper workspace',
      ctaHref: buildAppHomeUrl('guide_lit_review_en'),
      secondaryCtaLabel: 'Open Robotics VLA example',
      secondaryCtaHref: buildAppPairUrl(pairOpenvlaRt2),
      faq: FAQ.literatureReview.en,
      sections: [
        {
          heading: 'Why unstructured graph clicking leads to "tab bankruptcy"',
          paragraphs: [
            'Citation graphs fail researchers when every interesting node triggers another unconstrained expansion. Within twenty minutes you have forty open PDFs and still no outline for your Related Work section.',
            'A good literature review is organized around competing problem formulations and transitions between them — exactly what cluster boundaries and bridge paths represent.',
          ],
        },
        {
          heading: 'The 5-step citation network workflow',
          paragraphs: [
            'Follow this sequence to turn an interactive graph into a structured section outline:',
          ],
          bullets: [
            'Step 1 — Anchor selection: Pick at least two papers with different assumptions (for example, an open-source VLA baseline and a closed web-knowledge VLA baseline, OpenVLA vs RT-2) rather than starting from a single survey.',
            'Step 2 — Cluster naming: Build a 2-hop neighbourhood graph and inspect the Louvain cluster legend. Each cluster gives you candidate subsections (datasets, backbone architectures, evaluation benchmarks).',
            'Step 3 — Timeline scrubbing: Scrub publication years from oldest to newest to separate foundational problem definitions from recent incremental baselines.',
            'Step 4 — Cross-cluster bridge finding: Select one representative paper from Cluster A and one from Cluster B, then run Two-Paper Connection Search. Papers sitting at co-citation or coupling junctions are usually the exact comparative studies you should cite.',
            'Step 5 — Primary-text verification & export: Open arXiv sections in-app (or via DOI) to confirm what each bridge paper actually proved, save notes locally, and export clean BibTeX.',
          ],
        },
        {
          heading: 'Common pitfalls to avoid',
          paragraphs: [
            'Do not treat citation count or node radius as scientific correctness: seminal negative results or brand-new corrections naturally have smaller nodes than older benchmarks.',
            'Always pair citation chaining with at least one keyword query across OpenAlex / Semantic Scholar so independent communities using different terminology are not excluded by citation insularity.',
          ],
        },
      ],
      sources: [
        { label: 'Wohlin, C. (2014). Guidelines for snowballing in systematic literature studies (EASE).', url: 'https://doi.org/10.1145/2601248.2601268' },
        { label: 'CiteDuo Architecture & Graph Pipeline Documentation', url: 'https://github.com/benbenlijie/citeduo/blob/main/ARCHITECTURE.md' },
      ],
    },
    zh: {
      title: '文献综述中如何高效使用引文网络（避免越点越乱的五步工作流）',
      metaTitle: '文献综述中的引文网络工作流 | CiteDuo',
      description:
        '用五步收敛法把引文网络变成文献综述提纲：双锚点选文、Louvain 聚类、时间轴、跨簇寻桥与原文核验。',
      eyebrow: '科研工作流 · 文献综述实战',
      summaryAnswer:
        '高效使用引文网络做文献综述应遵循五步收敛法：（1）选 2～3 篇代表不同技术路线的锚点论文；（2）用 2 跳网络与 Louvain 主题簇划分子方向；（3）用年份时间轴区分奠基文献与最新基线；（4）在两个主题簇代表作之间运行“双论文关联路径”找出对比综述或融合型桥梁论文；（5）回到正文核实引文语境并导出 BibTeX。',
      ctaLabel: '进入论文工作台实践',
      ctaHref: buildAppHomeUrl('guide_lit_review_zh'),
      secondaryCtaLabel: '打开机器人 VLA 真实案例',
      secondaryCtaHref: buildAppPairUrl(pairOpenvlaRt2),
      faq: FAQ.literatureReview.zh,
      sections: [
        {
          heading: '为什么很多人用引文图谱只会“攒下一堆未读标签页”',
          paragraphs: [
            '引文图最容易让人迷失的地方，是看到大节点就顺手点开扩展。二十分钟后浏览器开了四十个 PDF，却依然写不出 Related Work 的第一段分论点。',
            '好的文献综述不是按发表时间报菜名，而是讲清楚“这个领域分成哪几派、每一派解决了上一派的什么局限”——这恰恰对应图谱里的“主题簇”与“跨簇桥梁路径”。',
          ],
        },
        {
          heading: '五步把引文图谱转化为综述提纲',
          paragraphs: [
            '在 CiteDuo 工作台中，按以下顺序操作可以在 30 分钟内搭出清晰的综述骨架：',
          ],
          bullets: [
            '第 1 步（双锚点起步）：不要只搜一篇综述，挑选两篇方法路线明显不同的代表作（例如开源 VLA 基线 OpenVLA 与闭源网页知识迁移基线 RT-2）。',
            '第 2 步（用聚类定小节）：展开默认 2 跳引文图，悬停查看右上角 Louvain 主题簇图例（包含论文数、年份跨度与代表词），直接作为综述二级标题候选。',
            '第 3 步（时间轴看演进）：拖动底部发表年份时间轴从早到晚回放，分清谁是提出问题定义的先驱、谁是近两年的工程刷榜基线。',
            '第 4 步（跨簇寻桥找关键文献）：从两个不同聚类各选一篇代表作，点击“关联路径”。处在文献耦合交点或共被引中心的那篇中间论文，往往就是帮你把两派串起来的关键文献。',
            '第 5 步（原文核验与本地沉淀）：打开详情或内置 arXiv 阅读器核对实验结论，把核心摘录记入本地笔记，最后一键导出 BibTeX 或完整 JSON 图谱。',
          ],
        },
        {
          heading: '两个必须避开的误区',
          paragraphs: [
            '第一，节点大（被引多）只代表知名度高或发表早，不代表结论至今未被推翻；最新纠偏工作节点很小，需要结合施引方向一起看。',
            '第二，纯靠引文滚雪球可能困在同一个学术小圈子里。建议始终配合一次跨源关键词检索（Semantic Scholar + OpenAlex），避免漏掉使用不同术语的平行学派。',
          ],
        },
      ],
      sources: [
        { label: 'Wohlin, C. (2014). 系统文献调研中的滚雪球指南（EASE）', url: 'https://doi.org/10.1145/2601248.2601268' },
        { label: 'CiteDuo 架构与图谱构建说明（ARCHITECTURE.md）', url: 'https://github.com/benbenlijie/citeduo/blob/main/ARCHITECTURE.md' },
      ],
    },
  },
  {
    id: 'self-hosting-citeduo',
    category: 'docs',
    slug: 'self-hosting-citeduo',
    publishedAt: '2026-11-19',
    updatedAt: SITE_FACTS.lastUpdated,
    relatedIds: [
      'how-to-check-if-two-papers-are-related',
      'citeduo-vs-inciteful-literature-connector',
      'connected-papers-alternatives',
    ],
    en: {
      title: 'Self-Hosting CiteDuo: Docker, Local Source, API Keys & Privacy Policies',
      metaTitle: 'Self-Host CiteDuo: Bun + SQLite Setup',
      description:
        'Run CiteDuo locally with Bun and SQLite: install, configure, self-host behind Nginx, and keep papers, notes, and graphs on your machine.',
      eyebrow: 'Documentation · Self-Hosting & Operations',
      summaryAnswer:
        'CiteDuo runs as a single Bun process backed by one SQLite file (data/app.db) under the MIT license. Start locally in one command via Docker (ghcr.io/benbenlijie/citeduo:latest on 127.0.0.1:8787) or from source with Bun >= 1.3 and pnpm 9; no external database, Redis, or cloud account is required.',
      ctaLabel: 'View repository & Dockerfile on GitHub',
      ctaHref: SITE_FACTS.githubRepoUrl,
      secondaryCtaLabel: 'Open live demo workspace',
      secondaryCtaHref: buildAppHomeUrl('docs_self_host_en'),
      faq: FAQ.selfHosting.en,
      sections: [
        {
          heading: 'Option 1: One-command Docker deployment',
          paragraphs: [
            'Binding to 127.0.0.1 keeps your local instance reachable only from your own machine while persisting cached papers and graphs in a Docker volume:',
          ],
          code: `docker run -d --name citeduo \\
  -p 127.0.0.1:8787:8787 \\
  -v citeduo-data:/data \\
  ${SITE_FACTS.githubContainerImage}`,
        },
        {
          heading: 'Option 2: Run from source (Bun + pnpm)',
          paragraphs: [
            `Requires Bun >= ${SITE_FACTS.runtime.bunMinVersion} and pnpm ${SITE_FACTS.runtime.pnpmMajor}. The setup script installs dependencies, creates data/, and copies server/.env.example to server/.env:`,
          ],
          code: `git clone ${SITE_FACTS.githubRepoUrl}.git
cd citeduo
bash scripts/setup.sh
bun run build:web
bun run server
# Listening on http://127.0.0.1:8787`,
        },
        {
          heading: 'Recommended environment settings & upstream politeness',
          paragraphs: [
            'CiteDuo enforces strict upstream rate-limit floors (for example, >= 3 seconds between arXiv API requests and >= 1 second between Semantic Scholar requests) checked by automated CI tests.',
          ],
          table: {
            headers: ['Variable', 'Default', 'Purpose & recommendation'],
            rows: [
              ['SEMANTIC_SCHOLAR_API_KEY', 'unset', 'Optional free key; greatly reduces 429 rate-limits during deep graph or path crawls.'],
              ['OPENALEX_API_KEY / CONTACT_EMAIL', 'researcher@example.com', 'Polite pool identification for OpenAlex search and related works.'],
              ['ACCESS_TOKEN', 'unset (loopback)', 'Set a strong random token whenever exposing an instance beyond localhost.'],
              ['PAPER_CONTENT_MODE', 'auto (full on loopback, off otherwise)', 'Controls whether the server caches/serves arXiv e-print full text; keep off on public multi-user hosts unless permitted.'],
              ['OPENCODE_ENABLED / AI_ACCESS_TOKEN', 'enabled if token set', 'Optional AI reading agent; fails closed (503/401) when no token is configured.'],
            ],
          },
        },
        {
          heading: 'Sub-path mounting & public demo protection',
          paragraphs: [
            'To serve the interactive app under /papers/ behind Nginx while keeping the root domain for static or server-rendered pages, build the frontend with VITE_BASE=/papers/ and set BASE_PATH=/papers in server/.env.',
            'If you run an open demo without ACCESS_TOKEN, set DEMO_PUBLIC=1, ADMIN_TOKEN, DEMO_DAILY_VISITOR_LIMIT, and DEMO_DAILY_REQUEST_LIMIT so automated bursts receive HTTP 429 instead of exhausting your upstream or LLM quota.',
          ],
        },
      ],
      sources: [
        { label: 'CiteDuo Dockerfile', url: 'https://github.com/benbenlijie/citeduo/blob/main/Dockerfile' },
        { label: 'CiteDuo Deployment Guide (DEPLOYMENT_GUIDE.md)', url: 'https://github.com/benbenlijie/citeduo/blob/main/DEPLOYMENT_GUIDE.md' },
        { label: 'arXiv API Terms of Use', url: 'https://info.arxiv.org/help/api/tou.html' },
      ],
    },
    zh: {
      title: '自托管部署 CiteDuo：Docker 一键运行、源码编译与合规配置指南',
      metaTitle: 'CiteDuo 自托管：Bun + SQLite 部署',
      description:
        '用 Bun + SQLite 本地部署 CiteDuo：安装、配置、Nginx 反向代理，并把论文缓存、笔记与图谱保存在自己的机器上。',
      eyebrow: '部署文档 · 本地优先与自托管',
      summaryAnswer:
        'CiteDuo 采用 MIT 许可证开源，整个系统仅由单个 Bun 进程与单个 SQLite 文件（data/app.db）组成，无需配置 PostgreSQL、Redis 或任何云账号。使用 Docker 一条命令即可在 127.0.0.1:8787 启动，也可以通过 Bun >= 1.3 与 pnpm 9 从源码构建运行。',
      ctaLabel: '前往 GitHub 查看源码与 Dockerfile',
      ctaHref: SITE_FACTS.githubRepoUrl,
      secondaryCtaLabel: '打开在线工作台体验',
      secondaryCtaHref: buildAppHomeUrl('docs_self_host_zh'),
      faq: FAQ.selfHosting.zh,
      sections: [
        {
          heading: '方式一：Docker 一条命令启动（推荐）',
          paragraphs: [
            '绑定在 127.0.0.1:8787 可确保服务仅本机可访问，所有论文缓存与关系数据持久化在 citeduo-data 卷中：',
          ],
          code: `docker run -d --name citeduo \\
  -p 127.0.0.1:8787:8787 \\
  -v citeduo-data:/data \\
  ${SITE_FACTS.githubContainerImage}`,
        },
        {
          heading: '方式二：从源码本地编译运行（Bun + pnpm）',
          paragraphs: [
            `需要安装 Bun >= ${SITE_FACTS.runtime.bunMinVersion} 和 pnpm ${SITE_FACTS.runtime.pnpmMajor}。初始化脚本会自动检查依赖、创建 data/ 目录并生成 server/.env：`,
          ],
          code: `git clone ${SITE_FACTS.githubRepoUrl}.git
cd citeduo
bash scripts/setup.sh
bun run build:web
bun run server
# 默认监听 http://127.0.0.1:8787`,
        },
        {
          heading: '关键环境变量、上游礼貌限速与合规边界',
          paragraphs: [
            'CiteDuo 内置并由自动化测试强制校验上游礼貌间隔（例如 arXiv API 请求间隔不少于 3 秒、Semantic Scholar 不少于 1 秒）：',
          ],
          table: {
            headers: ['环境变量', '默认行为', '作用与配置建议'],
            rows: [
              ['SEMANTIC_SCHOLAR_API_KEY', '未设置', '可选免费申请；配置后能显著减少深度建图和联网寻路时的 429 限流等待。'],
              ['OPENALEX_API_KEY / CONTACT_EMAIL', 'researcher@example.com', '用于接入 OpenAlex 礼貌池，提升跨源检索稳定性。'],
              ['ACCESS_TOKEN', '本机默认留空', '只要通过反向代理暴露到公网或局域网，务必设置高强度随机访问口令。'],
              ['PAPER_CONTENT_MODE', 'auto（回环为 full，其余为 off）', '控制服务端是否缓存并分发 arXiv 全文；公网多人实例默认保持 off，仅返回摘要与原文链接以遵守 arXiv 条款。'],
              ['OPENCODE_ENABLED / AI_ACCESS_TOKEN', '无口令时自动拒绝', '可选 AI 阅读助手；未配置口令时自动关闭（Fail-closed），不会匿名消耗大模型额度。'],
            ],
          },
        },
        {
          heading: '子路径挂载与公开体验预算保护',
          paragraphs: [
            '若将交互应用挂载在 /papers/ 子路径下（如 citeduo.com/papers/），构建前端时传入 VITE_BASE=/papers/ 并在 server/.env 设置 BASE_PATH=/papers 即可。',
            '若需对外提供免口令体验环境，请启用 DEMO_PUBLIC=1 并同时配置 ADMIN_TOKEN、DEMO_DAILY_VISITOR_LIMIT 与 DEMO_DAILY_REQUEST_LIMIT，防止突发流量打穿上游或大模型账单。',
          ],
        },
      ],
      sources: [
        { label: 'CiteDuo Dockerfile 源码', url: 'https://github.com/benbenlijie/citeduo/blob/main/Dockerfile' },
        { label: 'CiteDuo 本地部署与运维指南（DEPLOYMENT_GUIDE.md）', url: 'https://github.com/benbenlijie/citeduo/blob/main/DEPLOYMENT_GUIDE.md' },
        { label: 'arXiv API 使用条款说明', url: 'https://info.arxiv.org/help/api/tou.html' },
      ],
    },
  },
  {
    id: 'verified-two-paper-citation-cases',
    category: 'guides',
    slug: 'verified-two-paper-citation-cases',
    publishedAt: '2026-11-21',
    updatedAt: SITE_FACTS.lastUpdated,
    relatedIds: [
      'how-to-check-if-two-papers-are-related',
      'citation-path-vs-bibliographic-coupling-vs-co-citation',
      'how-to-use-citation-networks-in-a-literature-review',
    ],
    en: {
      title: 'Three Verified Two-Paper Citation Cases',
      metaTitle: 'Verified Two-Paper Citation Cases | CiteDuo',
      description:
        'Walk through three live CiteDuo cases: SAM to π0, ALOHA to RDT, and OpenVLA to RT-2, with the actual evidence type and path result.',
      eyebrow: 'Case Studies · Live evidence paths',
      summaryAnswer:
        'These three cases show bibliographic coupling through a ubiquitous classic, coupling through a shared imitation-learning foundation, and a direct citation. Reproduce them with the same deep links, then read the source paragraph before making a claim.',
      ctaLabel: 'Open SAM ↔ π0 case',
      ctaHref: buildAppPairUrl(pairSamPi0),
      secondaryCtaLabel: 'Browse all verified examples',
      secondaryCtaHref: '/#examples',
      faq: [
        {
          question: 'Are these path results permanent?',
          answer:
            'No. Upstream citation data changes as papers are indexed and reference lists are corrected. The results here were sampled on 2026-11-21; rerun the deep links before quoting a path in a paper.',
        },
        {
          question: 'Does a shared classic prove two papers are closely related?',
          answer:
            'Not by itself. Attention Is All You Need is a ubiquitous shared ancestor. Check the alternatives and look for a specific domain ancestor such as CLIP or RT-1 before treating coupling as strong evidence.',
        },
        {
          question: 'Can CiteDuo determine whether a citation is supportive or critical?',
          answer:
            'No. CiteDuo shows citation metadata and path structure. Open the citing paragraph to determine whether the author agrees, compares, or merely mentions the cited work.',
        },
      ],
      sections: [
        {
          heading: 'Why publish live path results',
          paragraphs: [
            'A benchmark screenshot is easy to fake and becomes stale. These cases publish the exact paper pair, the evidence type CiteDuo returned, the best path, and the alternatives so another researcher can reproduce or challenge the result.',
            'The examples were sampled on 2026-11-21 from the public demo. Citation graphs evolve, so the deep links remain the source of truth; the written result is a dated observation, not a permanent fact.',
          ],
        },
        {
          heading: 'Case 1 — SAM ↔ π0: coupling through a ubiquitous classic',
          paragraphs: [
            'The best route returned two reference hops converging on Attention Is All You Need. That is bibliographic coupling, not a direct citation. The alternatives are more informative: a second coupling route through CLIP and a two-hop path through RT-2.',
          ],
          table: {
            headers: ['Result', 'What CiteDuo returned', 'What it proves', 'What it does not prove'],
            rows: [
              ['Best path', '2-hop coupling via Attention Is All You Need', 'Both papers build on a shared general machine-learning foundation', 'Direct influence or exclusive methodological lineage'],
              ['Alternative', 'Coupling via CLIP; path via RT-2', 'A more specific vision-language and robotics bridge exists', 'That every shared ancestor is equally meaningful'],
            ],
          },
        },
        {
          heading: 'Case 2 — ALOHA ↔ RDT: shared imitation-learning foundations',
          paragraphs: [
            'The best path was a 2-hop coupling route through A Reduction of Imitation Learning and Structured Prediction to No-Regret Online Learning. Alternative coupling routes passed through RT-1 and a deep conditional generative model.',
            'This is a useful example of coupling in two newer robotics papers: they do not need to cite each other for the graph to reveal a shared methodological base.',
          ],
          table: {
            headers: ['Result', 'What CiteDuo returned', 'What it proves', 'What it does not prove'],
            rows: [
              ['Best path', '2-hop coupling via a foundational imitation-learning paper', 'Shared data-collection and policy-learning lineage', 'That RDT directly extends ALOHA'],
              ['Alternatives', 'Coupling via RT-1 and a deep conditional generative model', 'Several plausible shared ancestors exist', 'That one ancestor alone explains the relationship'],
            ],
          },
        },
        {
          heading: 'Case 3 — OpenVLA → RT-2: a direct citation',
          paragraphs: [
            'OpenVLA cites RT-2 directly. CiteDuo returns a one-hop reference edge with no alternatives. This is the strongest structural evidence among the three cases, but it still does not tell you whether the citation is supportive, critical, or a passing comparison.',
          ],
          table: {
            headers: ['Result', 'What CiteDuo returned', 'What it proves', 'What it does not prove'],
            rows: [
              ['Best path', '1-hop direct reference, score 50', 'OpenVLA explicitly cites RT-2', 'The author’s stance or the size of RT-2’s influence'],
            ],
          },
        },
        {
          heading: 'How to reproduce the three cases',
          paragraphs: [
            'Open each site-relative deep link, then compare the typed edge badges and alternative paths with the tables above. Production paths resolve on citeduo.com after ICP clearance; the same application is currently available on watchdeep.net.',
          ],
          code: `SAM ↔ π0
/papers/?paper=2304.02643&from=2304.02643&to=2410.24164

ALOHA ↔ RDT
/papers/?paper=2304.13705&from=2304.13705&to=2410.07864

OpenVLA → RT-2
/papers/?paper=2406.09246&from=2406.09246&to=2307.15818`,
        },
        {
          heading: 'How to use a path result responsibly',
          paragraphs: [
            'Treat the result as a reading plan, not a conclusion. Check the weakest hop, compare alternatives, and open the cited paragraph before writing that one paper influenced another.',
          ],
          bullets: [
            'Prefer a specific domain ancestor over a ubiquitous classic when explaining a close method relationship.',
            'Record the date and upstream source when citing a live result.',
            'State the evidence type: direct citation, coupling, co-citation, multi-hop path, or semantic bridge.',
            'Do not claim citation sentiment from metadata alone.',
          ],
        },
      ],
      sources: [
        { label: 'SAM: Segment Anything (arXiv 2304.02643)', url: 'https://arxiv.org/abs/2304.02643' },
        { label: 'π0: A Vision-Language-Action Flow Model (arXiv 2410.24164)', url: 'https://arxiv.org/abs/2410.24164' },
        { label: 'ALOHA: Learning Fine-Grained Bimanual Manipulation (arXiv 2304.13705)', url: 'https://arxiv.org/abs/2304.13705' },
        { label: 'RDT-1B: a Diffusion Foundation Model for Bimanual Manipulation (arXiv 2410.07864)', url: 'https://arxiv.org/abs/2410.07864' },
        { label: 'OpenVLA (arXiv 2406.09246)', url: 'https://arxiv.org/abs/2406.09246' },
        { label: 'RT-2: Vision-Language-Action Models (arXiv 2307.15818)', url: 'https://arxiv.org/abs/2307.15818' },
        { label: 'CiteDuo Pathfinding Implementation (server/pathfind.ts)', url: 'https://github.com/benbenlijie/citeduo/blob/main/server/pathfind.ts' },
      ],
    },
    zh: {
      title: '三组已验证的双论文关系案例',
      metaTitle: '三组已验证的双论文关系案例 | CiteDuo',
      description:
        '用 CiteDuo 的真实返回拆解 SAM→π0、ALOHA→RDT 与 OpenVLA→RT-2 三组案例，说明证据类型、路径结果与不能证明什么。',
      eyebrow: '案例研究 · 线上真实路径结果',
      summaryAnswer:
        '三组案例分别展示：经由泛用经典的文献耦合、经由共同模仿学习基础的文献耦合，以及一条直接引用。用相同深链复现，并在下结论前阅读施引段落。',
      ctaLabel: '打开 SAM ↔ π0 案例',
      ctaHref: buildAppPairUrl(pairSamPi0),
      secondaryCtaLabel: '浏览全部已验证示例',
      secondaryCtaHref: '/zh/#examples',
      faq: [
        {
          question: '这些路径结果是永久的吗？',
          answer:
            '不是。上游引文数据会随着论文入库和参考文献修订而变化。本文结果采样于 2026-11-21，引用前应重新打开深链核验。',
        },
        {
          question: '共享一个泛用经典就能证明两篇论文关系很近吗？',
          answer:
            '不能。Attention Is All You Need 这类经典过于普遍。还要看备选路线，并寻找 CLIP、RT-1 这类更具体的领域祖先。',
        },
        {
          question: 'CiteDuo 能判断引用是支持还是批评吗？',
          answer:
            '不能。CiteDuo 展示的是引文元数据和路径结构；必须打开施引段落，确认作者是支持、对比还是顺带提及。',
        },
      ],
      sections: [
        {
          heading: '为什么要公开真实路径结果',
          paragraphs: [
            '截图很容易伪造，也会过期。这里同时公开论文对、CiteDuo 返回的证据类型、最佳路径和备选路线，方便其他研究者复现或质疑。',
            '案例采样于 2026-11-21 的公开 Demo。引文图谱会变化，因此深链才是最终依据，文中的结果是带日期的观察，不是永久事实。',
          ],
        },
        {
          heading: '案例一：SAM ↔ π0，经由泛用经典的文献耦合',
          paragraphs: [
            '最佳路径是两条参考文献共同指向 Attention Is All You Need，因此是文献耦合，不是直接引用。更有信息量的是备选路线：经由 CLIP 的第二条耦合路径，以及经由 RT-2 的两跳路径。',
          ],
          table: {
            headers: ['结果', 'CiteDuo 实际返回', '能证明什么', '不能证明什么'],
            rows: [
              ['最佳路径', '经由 Attention Is All You Need 的 2 跳文献耦合', '两篇论文共享通用机器学习基础', '直接影响或排他性的方法传承'],
              ['备选路径', '经由 CLIP 的耦合；经由 RT-2 的 2 跳路径', '存在更具体的视觉-语言与机器人桥梁', '所有共同祖先都同等重要'],
            ],
          },
        },
        {
          heading: '案例二：ALOHA ↔ RDT，共享模仿学习基础',
          paragraphs: [
            '最佳路径是经由 A Reduction of Imitation Learning and Structured Prediction to No-Regret Online Learning 的 2 跳文献耦合。备选路线包括 RT-1 与深度条件生成模型。',
            '这是两篇较新的机器人论文：它们不需要互相引用，图谱也能暴露共享的方法论底座。',
          ],
          table: {
            headers: ['结果', 'CiteDuo 实际返回', '能证明什么', '不能证明什么'],
            rows: [
              ['最佳路径', '经由模仿学习经典工作的 2 跳文献耦合', '共享数据采集与策略学习脉络', 'RDT 直接延续了 ALOHA'],
              ['备选路径', '经由 RT-1 与深度条件生成模型的耦合', '存在多个合理的共同祖先', '单独一个祖先就能解释全部关系'],
            ],
          },
        },
        {
          heading: '案例三：OpenVLA → RT-2，直接引用',
          paragraphs: [
            'OpenVLA 直接引用 RT-2。CiteDuo 返回一跳参考文献边，没有备选路径。这是三组案例中最强的结构证据，但仍不能说明引用是支持、批评还是顺带比较。',
          ],
          table: {
            headers: ['结果', 'CiteDuo 实际返回', '能证明什么', '不能证明什么'],
            rows: [
              ['最佳路径', '1 跳直接参考文献，分数 50', 'OpenVLA 明确引用了 RT-2', '作者态度或 RT-2 的实际影响大小'],
            ],
          },
        },
        {
          heading: '如何复现三组案例',
          paragraphs: [
            '打开站内相对深链，对照上表的证据类型和备选路径。ICP 通过后正式域名使用 citeduo.com；当前同一应用可在 watchdeep.net 访问。',
          ],
          code: `SAM ↔ π0
/papers/?paper=2304.02643&from=2304.02643&to=2410.24164

ALOHA ↔ RDT
/papers/?paper=2304.13705&from=2304.13705&to=2410.07864

OpenVLA → RT-2
/papers/?paper=2406.09246&from=2406.09246&to=2307.15818`,
        },
        {
          heading: '如何负责任地使用路径结果',
          paragraphs: [
            '把结果当作阅读计划，而不是结论。检查最弱跳、比较备选路线，并在写“某篇论文影响了另一篇”之前打开施引段落。',
          ],
          bullets: [
            '解释紧密方法关系时，优先寻找具体领域祖先，而不是泛用经典。',
            '引用线上结果时记录日期和上游数据源。',
            '明确写出证据类型：直接引用、文献耦合、共被引、多跳路径或语义桥。',
            '不要只根据元数据判断引用是支持还是批评。',
          ],
        },
      ],
      sources: [
        { label: 'SAM：Segment Anything（arXiv 2304.02643）', url: 'https://arxiv.org/abs/2304.02643' },
        { label: 'π0：Vision-Language-Action Flow Model（arXiv 2410.24164）', url: 'https://arxiv.org/abs/2410.24164' },
        { label: 'ALOHA：Learning Fine-Grained Bimanual Manipulation（arXiv 2304.13705）', url: 'https://arxiv.org/abs/2304.13705' },
        { label: 'RDT-1B：Diffusion Foundation Model for Bimanual Manipulation（arXiv 2410.07864）', url: 'https://arxiv.org/abs/2410.07864' },
        { label: 'OpenVLA（arXiv 2406.09246）', url: 'https://arxiv.org/abs/2406.09246' },
        { label: 'RT-2：Vision-Language-Action Models（arXiv 2307.15818）', url: 'https://arxiv.org/abs/2307.15818' },
        { label: 'CiteDuo 路径分类与评分实现（server/pathfind.ts）', url: 'https://github.com/benbenlijie/citeduo/blob/main/server/pathfind.ts' },
      ],
    },
  },
]

export function articlePath(article: Pick<SiteArticleSpec, 'category' | 'slug'>, locale: 'en' | 'zh'): string {
  const prefix = locale === 'zh' ? '/zh' : ''
  return `${prefix}/${article.category}/${article.slug}`
}

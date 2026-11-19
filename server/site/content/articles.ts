import { buildAppHomeUrl, buildAppPairUrl, SITE_FACTS } from '../facts'
import type { SiteArticleSpec } from '../types'

const [pairSamPi0, pairAlohaRdt, pairOpenvlaPi0] = SITE_FACTS.examplePairs

export const SITE_ARTICLES: SiteArticleSpec[] = [
  {
    id: 'how-to-check-if-two-papers-are-related',
    category: 'guides',
    slug: 'how-to-check-if-two-papers-are-related',
    lastmod: SITE_FACTS.lastUpdated,
    en: {
      title: 'How to Check If Two Research Papers Are Related',
      metaTitle: 'How to Check If Two Papers Are Related — Citation Paths & Coupling | CiteDuo',
      description:
        'A practical workflow to verify whether two academic papers are directly linked, share foundational references, are co-cited together, or only look similar in abstract.',
      eyebrow: 'Guide · Literature Verification',
      summaryAnswer:
        'To check whether two papers are genuinely related, test four signals in decreasing order of evidence strength: (1) direct citation in either direction, (2) bibliographic coupling via shared references, (3) co-citation by later papers that compare or combine them, and (4) multi-hop bridge papers or embedding similarity when vocabulary differs.',
      ctaLabel: 'Try with two example papers',
      ctaHref: buildAppPairUrl(pairSamPi0),
      secondaryCtaLabel: 'Open paper workspace',
      secondaryCtaHref: buildAppHomeUrl('guide_two_papers_en'),
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
      metaTitle: '如何判断两篇论文是否相关：引用链、文献耦合与共被引核查指南 | CiteDuo',
      description:
        '手头已经有两篇论文时，如何按证据强度依次核查直接引用、文献耦合、共被引、多跳桥梁论文与语义相似，避免把标题相近误判为方法同源。',
      eyebrow: '方法指南 · 文献关系核验',
      summaryAnswer:
        '判断两篇论文是否真正相关，最稳妥的做法是按证据从强到弱依次核查四类信号：（1）是否存在单向或双向直接引用；（2）是否共同引用同一批核心前驱文献（文献耦合）；（3）是否被后续综述或改进工作同时引用（共被引）；（4）跨术语体系时是否存在多跳桥梁论文或向量语义近邻。',
      ctaLabel: '用两篇示例论文体验',
      ctaHref: buildAppPairUrl(pairSamPi0),
      secondaryCtaLabel: '打开论文工作台',
      secondaryCtaHref: buildAppHomeUrl('guide_two_papers_zh'),
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
    lastmod: SITE_FACTS.lastUpdated,
    en: {
      title: 'Citation Path vs Bibliographic Coupling vs Co-citation Explained',
      metaTitle: 'Citation Path vs Bibliographic Coupling vs Co-citation | CiteDuo',
      description:
        'Understand the structural difference between directed citation chains, bibliographic coupling, and co-citation — when each signal works best and where each fails.',
      eyebrow: 'Methodology · Scientometrics in Practice',
      summaryAnswer:
        'A citation path traces directed chronological inheritance (A → M → B), bibliographic coupling measures shared references fixed at publication time (A → R ← B), and co-citation measures how later authors group two papers together over time (A ← C → B). Use coupling for brand-new papers with zero citations, co-citation for field consensus, and directed paths for idea transmission.',
      ctaLabel: 'Inspect a 2-hop coupling example',
      ctaHref: buildAppPairUrl(pairAlohaRdt),
      secondaryCtaLabel: 'Inspect a 1-hop direct citation',
      secondaryCtaHref: buildAppPairUrl(pairOpenvlaPi0),
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
      metaTitle: '引用链路 vs 文献耦合 vs 共被引：原理对比与适用场景 | CiteDuo',
      description:
        '用直观箭头结构讲清有向引用链、文献耦合（Bibliographic Coupling）与共被引（Co-citation）的本质区别、时间特性以及在文献调研中的最佳用法。',
      eyebrow: '科学计量方法 · 图谱原理解析',
      summaryAnswer:
        '有向引用链刻画思想按时间的传递（A ← M ← B）；文献耦合看两篇论文是否共同引用同一批前人文献（A → R ← B），发表即固定，最适合零被引新论文；共被引看后续论文是否同时把两者放在一起讨论（A ← C → B），随时间演化，最适合观察学界共识。',
      ctaLabel: '查看 2 跳文献耦合真实案例',
      ctaHref: buildAppPairUrl(pairAlohaRdt),
      secondaryCtaLabel: '查看 1 跳直接引用真实案例',
      secondaryCtaHref: buildAppPairUrl(pairOpenvlaPi0),
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
    lastmod: SITE_FACTS.lastUpdated,
    en: {
      title: 'CiteDuo vs Inciteful Literature Connector: Honest Comparison',
      metaTitle: 'CiteDuo vs Inciteful Literature Connector — Features & Trade-offs',
      description:
        'A factual comparison between CiteDuo and Inciteful Literature Connector for connecting two academic papers: data sources, path explanations, self-hosting, and ideal use cases.',
      eyebrow: 'Comparison · Two-Paper Connectors',
      summaryAnswer:
        'Both CiteDuo and Inciteful Literature Connector find paths between two academic papers — CiteDuo is not the only tool that connects two papers. Choose Inciteful when you want an instant zero-install web service with advanced SQL-like OpenAlex filtering over large corpus tables; choose CiteDuo when you want hop-by-hop typed evidence explanations (direct vs coupling vs co-citation vs semantic), interactive 2D/3D neighbourhood graphs, in-app arXiv bilingual reading, or MIT-licensed local self-hosting.',
      ctaLabel: 'Try CiteDuo two-paper path',
      ctaHref: buildAppPairUrl(pairSamPi0),
      secondaryCtaLabel: 'View CiteDuo source on GitHub',
      secondaryCtaHref: SITE_FACTS.githubRepoUrl,
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
      metaTitle: 'CiteDuo vs Inciteful Literature Connector：双论文连接工具对比',
      description:
        '客观对比 CiteDuo 与 Inciteful Literature Connector 在双论文路径连接、证据解释、交互式引文图谱、arXiv 阅读与本地自托管方面的差异与各自优势。',
      eyebrow: '工具对比 · 双论文关联分析',
      summaryAnswer:
        'Inciteful 的 Literature Connector 同样支持连接两篇论文——CiteDuo 并不是唯一能连接两篇论文的工具。如果你希望免安装直接在网页端对大规模开放引文表做灵活筛选，Inciteful 非常成熟；如果你需要逐跳区分证据类型（直接引用、文献耦合、共被引、语义相似）、在同一工作台切换 2D/3D 聚类网络与 arXiv 双语阅读，或者需要 MIT 开源本地自托管，CiteDuo 更合适。',
      ctaLabel: '体验 CiteDuo 双论文关联分析',
      ctaHref: buildAppPairUrl(pairSamPi0),
      secondaryCtaLabel: '查看 GitHub 开源仓库',
      secondaryCtaHref: SITE_FACTS.githubRepoUrl,
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
    lastmod: SITE_FACTS.lastUpdated,
    en: {
      title: 'Connected Papers Alternatives in 2026: Cloud & Self-Hosted Options',
      metaTitle: 'Connected Papers Alternatives (2026) — Litmaps, ResearchRabbit, Inciteful & CiteDuo',
      description:
        'Compare practical alternatives to Connected Papers across single-paper similarity graphs, ongoing alerts, two-paper pathfinding, and open-source self-hosting.',
      eyebrow: 'Comparison · Literature Mapping Landscape',
      summaryAnswer:
        'The best Connected Papers alternative depends on your workflow: use ResearchRabbit or Litmaps for cloud collections and new-paper email alerts, Inciteful for hosted corpus filtering and two-paper connector tables, and CiteDuo when you want an MIT-licensed, self-hosted workspace that combines interactive cluster graphs with hop-by-hop two-paper connection explanations.',
      ctaLabel: 'Open CiteDuo workspace',
      ctaHref: buildAppHomeUrl('compare_cp_alternatives_en'),
      secondaryCtaLabel: 'Try two-paper example',
      secondaryCtaHref: buildAppPairUrl(pairSamPi0),
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
      metaTitle: 'Connected Papers 替代工具对比（2026）：Litmaps、ResearchRabbit、Inciteful 与 CiteDuo',
      description:
        '按真实科研场景对比 Connected Papers、Litmaps、ResearchRabbit、Inciteful 与开源本地优先工具 CiteDuo，帮你按“单篇概览、长期追踪、双论文寻路、私有部署”选对工具。',
      eyebrow: '工具盘点 · 文献图谱生态对比',
      summaryAnswer:
        '没有哪一款工具能在所有环节通吃：快速看单篇论文的相似文献概览可继续用 Connected Papers；需要云端收藏夹和最新论文邮件提醒可选 Litmaps 或 ResearchRabbit；免安装网页端筛表与连接选 Inciteful；如果你需要“不限次本地建图 + 逐跳解释任意两篇论文怎么连上 + arXiv 双语阅读 + MIT 开源自托管”，CiteDuo 是直接对应的选择。',
      ctaLabel: '打开 CiteDuo 论文工作台',
      ctaHref: buildAppHomeUrl('compare_cp_alternatives_zh'),
      secondaryCtaLabel: '体验双论文关联示例',
      secondaryCtaHref: buildAppPairUrl(pairSamPi0),
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
    lastmod: SITE_FACTS.lastUpdated,
    en: {
      title: 'How to Use Citation Networks in a Literature Review Without Getting Lost',
      metaTitle: 'How to Use Citation Networks in a Literature Review | CiteDuo',
      description:
        'A structured 5-stage workflow combining forward/backward snowballing, topic clustering, and two-paper bridge analysis to write rigorous literature reviews.',
      eyebrow: 'Workflow · Literature Review',
      summaryAnswer:
        'Use citation networks in five bounded passes: (1) pick 2–3 anchor papers from different angles, (2) map Louvain clusters to name distinct sub-approaches, (3) run backward and forward lineage checks for roots and state-of-the-art, (4) run two-paper path analysis between clusters to find synthesis papers, and (5) verify claims in full text before exporting BibTeX.',
      ctaLabel: 'Enter paper workspace',
      ctaHref: buildAppHomeUrl('guide_lit_review_en'),
      secondaryCtaLabel: 'Open Robotics VLA example',
      secondaryCtaHref: buildAppPairUrl(pairOpenvlaPi0),
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
            'Step 1 — Anchor selection: Pick at least two papers with different assumptions (for example, an autoregressive VLA policy and a diffusion/flow-matching policy) rather than starting from a single survey.',
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
      metaTitle: '文献综述如何使用引文网络：聚类命名、滚雪球与跨簇桥梁法 | CiteDuo',
      description:
        '把引文网络从“随便点点看”变成结构化 Related Work 提纲的五步方法：双锚点选文、Louvain 聚类分节、时间轴溯源、跨簇双论文寻桥与原文核验导出。',
      eyebrow: '科研工作流 · 文献综述实战',
      summaryAnswer:
        '高效使用引文网络做文献综述应遵循五步收敛法：（1）选 2～3 篇代表不同技术路线的锚点论文；（2）用 2 跳网络与 Louvain 主题簇划分子方向；（3）用年份时间轴区分奠基文献与最新基线；（4）在两个主题簇代表作之间运行“双论文关联路径”找出对比综述或融合型桥梁论文；（5）回到正文核实引文语境并导出 BibTeX。',
      ctaLabel: '进入论文工作台实践',
      ctaHref: buildAppHomeUrl('guide_lit_review_zh'),
      secondaryCtaLabel: '打开机器人 VLA 真实案例',
      secondaryCtaHref: buildAppPairUrl(pairOpenvlaPi0),
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
            '第 1 步（双锚点起步）：不要只搜一篇综述，挑选两篇方法路线明显不同的代表作（例如自回归动作模型 OpenVLA 与流匹配策略 π0）。',
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
    lastmod: SITE_FACTS.lastUpdated,
    en: {
      title: 'Self-Hosting CiteDuo: Docker, Local Source, API Keys & Privacy Policies',
      metaTitle: 'Self-Hosting CiteDuo — Docker, Bun + SQLite & arXiv Policy Guide',
      description:
        'Deploy CiteDuo on your laptop or lab server in minutes with Docker or Bun + SQLite. Covers upstream API keys, reverse proxy base paths, access tokens, and arXiv content compliance.',
      eyebrow: 'Documentation · Self-Hosting & Operations',
      summaryAnswer:
        'CiteDuo runs as a single Bun process backed by one SQLite file (data/app.db) under the MIT license. Start locally in one command via Docker (ghcr.io/benbenlijie/citeduo:latest on 127.0.0.1:8787) or from source with Bun >= 1.3 and pnpm 9; no external database, Redis, or cloud account is required.',
      ctaLabel: 'View repository & Dockerfile on GitHub',
      ctaHref: SITE_FACTS.githubRepoUrl,
      secondaryCtaLabel: 'Open live demo workspace',
      secondaryCtaHref: buildAppHomeUrl('docs_self_host_en'),
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
      metaTitle: 'CiteDuo 自托管部署指南：Docker、Bun + SQLite 与 arXiv 合规配置',
      description:
        '用 Docker 或 Bun + SQLite 在个人电脑或课题组服务器上快速自托管 CiteDuo。详解 API Key 提速、子路径反向代理、访问口令与 arXiv 全文合规边界。',
      eyebrow: '部署文档 · 本地优先与自托管',
      summaryAnswer:
        'CiteDuo 采用 MIT 许可证开源，整个系统仅由单个 Bun 进程与单个 SQLite 文件（data/app.db）组成，无需配置 PostgreSQL、Redis 或任何云账号。使用 Docker 一条命令即可在 127.0.0.1:8787 启动，也可以通过 Bun >= 1.3 与 pnpm 9 从源码构建运行。',
      ctaLabel: '前往 GitHub 查看源码与 Dockerfile',
      ctaHref: SITE_FACTS.githubRepoUrl,
      secondaryCtaLabel: '打开在线工作台体验',
      secondaryCtaHref: buildAppHomeUrl('docs_self_host_zh'),
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
]

export function articlePath(article: Pick<SiteArticleSpec, 'category' | 'slug'>, locale: 'en' | 'zh'): string {
  const prefix = locale === 'zh' ? '/zh' : ''
  return `${prefix}/${article.category}/${article.slug}`
}

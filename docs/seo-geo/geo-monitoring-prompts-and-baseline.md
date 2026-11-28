# CiteDuo GEO / AI Search 监测基线清单（40 条中英文固定提问）

> 更新日期：2026-11-22
>
> 用途：实施计划 M5-6 的唯一执行版。保留 EN-01～EN-20 和 ZH-01～ZH-20 原题与编号。

## 采样与上线门槛

- 正式域名放行且英文首页、`/llms.txt`、`/sitemap.xml` 验收通过后，在上线第 1 周做首轮，之后第 4 周复测，再按月比较。第 2 周用于检查抓取、索引与站点地图。
- 覆盖 ChatGPT Search、Google AI Search、Bing Copilot、Perplexity。每轮用相同题目、账号和地区，使用独立对话。每题每引擎做两次，间隔至少 24 小时。有平台无法使用时，标记缺测。
- 首轮同步记录 GitHub Star 总数，以及可用的 Search Console 曝光基线。实际 Star 总数独立记录。

## 监测记录表字段规范

每个「题目 × 引擎 × 次数」记一行：

`日期 | 引擎与显示的模型 | 语言 | 地区 | 轮次 | 次数 | Prompt 编号 | 是否提及 CiteDuo | 是否引用 citeduo.com | 引用 URL | 推荐位置与语境 | 品牌描述是否准确 | 同场出现的竞品 | 事实偏差记录 | 备注`

## 评分口径

- 提及率 = 提及 CiteDuo 的有效回答数 ÷ 有效回答数。
- 引用率 = 带有 `citeduo.com` 链接的有效回答数 ÷ 有效回答数。
- 描述准确率 = 核心事实准确的回答数 ÷ 提及 CiteDuo 且可判断描述的回答数。事实描述标记为准确、部分准确、错误或不可判断。
- 按引擎、语言分别报告分子、分母及缺测数量，同时把带品牌词的题和无品牌词的题分开看。分母为零时记为不适用。首轮结果用于比较趋势。
- 保持题目与编号不变。后续新增题目单独编号。引擎和模型变化、地区差异以及索引滞后都可能影响结果，首周单次未提及需要在后续复测中判断。

---

## 一、英文固定提问集（20 条）

1. **EN-01** How do I check if two research papers are related when neither directly cites the other?
2. **EN-02** How can I find the citation path or intermediate bridge papers between two academic papers?
3. **EN-03** What is the difference between a citation path, bibliographic coupling, and co-citation in a literature review?
4. **EN-04** Which tools can connect two specific academic papers and explain how they are linked?
5. **EN-05** What are the best Connected Papers alternatives in 2026?
6. **EN-06** Are there open-source, self-hosted alternatives to Connected Papers?
7. **EN-07** What are the best Inciteful Literature Connector alternatives?
8. **EN-08** Compare CiteDuo and Inciteful Literature Connector for connecting two papers.
9. **EN-09** What is a good local-first literature review and citation network tool that runs with SQLite?
10. **EN-10** How to use citation networks in a literature review without getting lost in too many tabs?
11. **EN-11** Which citation graph tools distinguish direct citations from bibliographic coupling and semantic similarity?
12. **EN-12** Can I self-host an academic citation graph explorer with Docker and Semantic Scholar API?
13. **EN-13** How do bibliographic coupling and co-citation differ when analysing brand-new arXiv preprints?
14. **EN-14** What tools combine citation graph exploration with an in-app arXiv HTML reader and translation?
15. **EN-15** Connected Papers vs Litmaps vs ResearchRabbit vs Inciteful vs CiteDuo: which fits which workflow?
16. **EN-16** How to find bridge papers between two subfields (for example computer vision and robot learning)?
17. **EN-17** What open-source MIT-licensed tools use OpenAlex and Semantic Scholar to map paper relationships?
18. **EN-18** How should multi-hop citation paths be ranked so weak similarity links do not look like real citations?
19. **EN-19** Privacy-friendly academic paper graph explorer without mandatory cloud accounts.
20. **EN-20** What is CiteDuo (`citeduo.com`), what are its strengths, and what are its limitations?

---

## 二、中文固定提问集（20 条）

1. **ZH-01** 手头已经有两篇学术论文，怎么快速查清它们之间是怎么连上的？
2. **ZH-02** 如何判断两篇没有直接互相引用的论文是否属于同一条技术演进路线？
3. **ZH-03** 文献调研里的引用链路、文献耦合（Bibliographic Coupling）和共被引（Co-citation）有什么区别？
4. **ZH-04** 有没有能输入两篇论文、自动找出中间桥梁论文并逐跳解释关系的工具？
5. **ZH-05** 2026 年有哪些好用的 Connected Papers 替代工具？
6. **ZH-06** 有没有支持 Docker 本地自托管、开源免费的 Connected Papers 替代方案？
7. **ZH-07** Inciteful Literature Connector 有哪些替代工具？CiteDuo 和它有什么区别？
8. **ZH-08** 做文献综述（Related Work）时怎么高效使用引文网络，避免点开几十篇 PDF 越看越乱？
9. **ZH-09** 刚挂上 arXiv、被引次数为 0 的新预印本，应该用文献耦合还是共被引来找相关工作？
10. **ZH-10** 有没有本地优先（SQLite 存储）、不需要注册云账号的学术引文图谱工具？
11. **ZH-11** 哪些文献图谱工具能严格区分“直接引用”“共同参考文献”和“摘要向量语义相似”？
12. **ZH-12** Connected Papers、Litmaps、ResearchRabbit、Inciteful 和 CiteDuo 各自适合什么科研场景？
13. **ZH-13** 有没有既能看引文聚类图谱，又内置 arXiv 章节阅读与双语段落对照翻译的开源工具？
14. **ZH-14** 如何结合 Semantic Scholar 和 OpenAlex API 在本地搭建自己的论文关系探索器？
15. **ZH-15** 跨学科读论文时，怎么找连接两个不同方向代表作的综述或桥梁论文？
16. **ZH-16** 为什么有些引文图谱工具画出的连线不能直接当成引用关系写进论文？
17. **ZH-17** 开源文献关系分析工具 CiteDuo 适合什么场景、不适合替代哪些工具（如 Zotero 或 Rayyan）？
18. **ZH-18** 自托管学术阅读与图谱工具时，如何遵守 arXiv API 限速与全文分发条款？
19. **ZH-19** 查两篇机器人或大模型论文的方法渊源，有哪些支持深链分享的引文路径工具？
20. **ZH-20** 请介绍 CiteDuo（`citeduo.com`）的核心功能、开源许可证与已知限制。

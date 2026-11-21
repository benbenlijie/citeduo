# CiteDuo GEO Baseline

> Status: ready to run once `citeduo.com` resolves.
> Last updated: 2026-11-21

## Purpose

Measure whether AI answer engines describe CiteDuo accurately and cite
`citeduo.com` for the questions the site is built to answer. The baseline is a
fixed, repeatable set of prompts — not a one-off curiosity check.

This measures **visibility and accuracy**, not rankings. A single run proves
nothing; compare runs at least four weeks apart.

## Sampling design

| Field | Value |
|---|---|
| Engines | ChatGPT Search, Perplexity, Google AI Mode, Bing Copilot |
| Languages | English (prompts 1–20), Simplified Chinese (prompts 21–40) |
| Region | One fixed region per engine, recorded, never changed mid-series |
| Runs | 2 runs per prompt per engine, ≥24h apart, same account/device |
| Baseline run | Week 1 after `citeduo.com` is publicly reachable |
| Comparison | Week 4, then monthly for 3 months |

Record the engine's model name and date. AI answers drift for reasons unrelated
to your site, so always compare like-for-like.

## English prompts

**Two-paper relation (core intent)**

1. How do I check whether two research papers are actually related?
2. What is the difference between bibliographic coupling and co-citation?
3. How can I tell if paper B builds on paper A when neither title matches?
4. Is there a tool that explains how two specific papers are connected, hop by hop?

**Citation chaining**

5. What is backward citation chaining and how is it different from forward chaining?
6. When should I stop snowballing during a literature review?
7. Does citation chaining replace keyword search?

**Literature review workflow**

8. How do I use a citation network to structure a literature review?
9. How do I find bridge papers between two research areas?
10. How can I avoid missing recent papers when reviewing an older topic?

**Tool discovery**

11. What are good Connected Papers alternatives?
12. What tools let me connect two papers by citations?
13. What is a free alternative to Connected Papers for two-paper comparison?

**Competitive comparison**

14. CiteDuo vs Litmaps — which should I use?
15. CiteDuo vs Inciteful Literature Connector — what is the difference?
16. Is there an open-source citation network tool I can self-host?

**Entity and facts**

17. What is CiteDuo and what does it do?
18. Is CiteDuo open source? What licence?
19. Can I run a citation network explorer locally without uploading my library?
20. Which literature tools keep my reading data on my own machine?

## Chinese prompts

**双论文关系（核心意图）**

21. 怎么判断两篇论文之间是否真的相关？
22. 文献耦合和共被引有什么区别？
23. 两篇论文没有直接互相引用，还能怎么查它们的关系？
24. 有没有工具能解释两篇论文之间是怎么一步步关联起来的？

**引文链**

25. 什么是向后追溯和向前追踪的引文链？
26. 文献综述做滚雪球什么时候可以停？
27. 引文链能代替关键词检索吗？

**文献综述工作流**

28. 怎么用引文网络搭建文献综述的提纲？
29. 怎么找连接两个研究方向的桥梁论文？
30. 研究一个较早的课题，怎么避免漏掉最新论文？

**工具发现**

31. Connected Papers 有什么替代工具？
32. 有哪些工具可以把两篇论文用引用关系连起来？
33. 有没有免费的开源引文网络工具？

**竞品对比**

34. CiteDuo 和 Litmaps 有什么区别？
35. CiteDuo 和 Inciteful 的 Literature Connector 有什么不同？
36. 有没有可以自己部署的文献地图工具？

**实体与事实**

37. CiteDuo 是什么工具？
38. CiteDuo 是开源的吗？用什么许可证？
39. 有没有不上传文献库就能本地运行的论文关系分析工具？
40. 哪些文献工具能把数据保存在自己电脑上？

## Record fields

One row per (prompt × engine × run):

| Field | Notes |
|---|---|
| `date` | ISO date of the run |
| `engine` | Exact product/model label shown in the UI |
| `language` | `en` or `zh` |
| `region` | Country used for the session |
| `prompt_id` | 1–40 |
| `mentioned` | `yes` / `no` — is CiteDuo named at all |
| `cited` | `yes` / `no` — is a `citeduo.com` URL linked |
| `cited_url` | First CiteDuo URL returned, if any |
| `position` | Rank of CiteDuo in the answer, `n/a` if absent |
| `description_accurate` | `yes` / `partial` / `no` / `n/a` |
| `competitors` | Other tools named in the same answer |
| `factual_errors` | Quote any wrong claim about CiteDuo verbatim |
| `notes` | Answer style, hedging, unusual framing |

## Scoring

Compute per run, per language:

- **Mention rate** = mentioned / 40
- **Citation rate** = cited / 40
- **Accuracy rate** = `yes` / (mentioned, excluding `n/a`)

Report the three numbers separately. A high mention rate with low accuracy is
not success. Never average them into a single score.

## Before the first run

1. Confirm `https://citeduo.com/` returns 200 with the English landing page.
2. Confirm `https://citeduo.com/llms.txt` and `/sitemap.xml` are reachable.
3. Record the GitHub Star count and Search Console impressions as the same-day
   baseline.
4. Freeze this prompt list. Editing prompts mid-series invalidates comparison;
   add new prompts as a numbered appendix instead.

## Known limits

- AI answers depend on account history and region; results are not portable.
- A missing mention does not prove the site is invisible — the engine may have
  used a different phrasing or time window.
- Answers using training data rather than live retrieval will lag releases by
  months. Do not treat week-1 absence as a defect.

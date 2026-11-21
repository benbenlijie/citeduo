# CiteDuo SEO/GEO 建设、迁移与转化实施计划

> 文档状态：待评审  
> 最后更新：2026-11-21
> 目标产品：CiteDuo  
> 主域名：`https://citeduo.com`  
> 产品仓库：`https://github.com/benbenlijie/citeduo`  
> 当前文档位置：`docs/seo-geo/citeduo-seo-geo-plan-and-handoff.md`

---

## 0. 2026-11-21 当前状态

> 本节优先于后文的 2026-11-19 基线；后文保留为原始计划与决策记录。

- 仓库 `main` 当前提交为 `3a43a6f`（PR #56）。
- M1、M2 和 M4 大部分已经实现：中英文 SSR Landing、14 篇双语内容页、canonical、hreflang、robots、sitemap、404、转化事件、Nginx 配置和迁移映射均在仓库中。
- 本地基线：后端 293 项测试通过，前端 472 项测试通过，typecheck、lint、构建全部通过；首页、About、3 个分类聚合页和 14 篇中英文内容页共 24 个 URL 本地返回 200。
- SEO/GEO 站点能力已补齐：标题/描述压缩、FAQPage、HowTo、主题相关推荐、双语 About、Guides/Compare/Docs 聚合页、作者与实体 schema、WebP/JPEG 图片优化和 `llms.txt`。
- 三个示例论文对已用线上 `POST /api/connect` 验证：SAM/π0 与 ALOHA/RDT 为 2 跳文献耦合，OpenVLA/RT-2 为 1 跳直接引用。原先的 OpenVLA/π0 实际返回语义桥，已替换为 OpenVLA/RT-2 并同步文案。
- 移动端已完成第一轮体验改造：营销站使用移动优先布局、折叠菜单、卡片式表格和 44px 触控目标；应用在小于 1024px 时改为“列表 / 图谱 / 详情”单栏三标签，桌面宽度继续使用原三栏工作台。
- 移动端回归覆盖 320、375、768、1024、1440px：无横向溢出；320/375px 营销页可见点击目标均不小于 44×44px；图谱工具条、时间轴、关联面板和详情页主要操作均达到 44px；1024px 自动恢复桌面三栏。
- 当前工作树包含未提交的 SEO/GEO 与移动端改动，尚未 commit、push 或部署。`citeduo.com` 上线仍受 ICP 备案阻塞，线上 `https://watchdeep.net/papers/` 仍是旧版本。
- 公网阻塞已确认：`citeduo.com` 被火山引擎未备案域名网关拦截，HTTP 302 到 `webblock.volcengine.com`，HTTPS 在 TLS 阶段被重置。
- 当前采用方案 A：继续在火山引擎完成 ICP 备案。备案期间保持 `https://watchdeep.net/papers/` 为在线 Demo，不启用旧域名 301。
- 备案材料、放行顺序和验收命令见 [`icp-filing-and-launch-readiness.md`](./icp-filing-and-launch-readiness.md)。

---

## 1. 文档目的

本文档用于把 CiteDuo 的 SEO、GEO、双语内容建设、转化优化和域名迁移整理成一个可执行的工程计划。

接手人应能通过本文档独立回答以下问题：

- 为什么要做这件事；
- 当前系统处于什么状态；
- 已经做了哪些决定和变更；
- 下一步按什么顺序实施；
- 哪些工作必须进入 CiteDuo GitHub 仓库；
- 哪些配置属于服务器或外部平台；
- 如何测试、部署、回滚和验收；
- 哪些资料、权限和前置条件仍然缺失；
- 如何判断 SEO、GEO 和 Star 转化是否有效。

本文档不是宣传文案，也不是最终页面内容。页面内容应在后续任务中单独编写和评审。

---

## 2. 执行摘要

CiteDuo 已经有一个可用的论文关系探索应用和一个准备长期使用的独立域名 `citeduo.com`。

当前最短路径不是继续增加产品功能，而是把已有产品能力转化为：

1. 搜索引擎和 AI 能直接读取的双语产品页面；
2. 从“搜索论文”到“通过关系发现新论文”的完整激活链路；
3. 用户获得价值后点击 GitHub Star 的业务转化；
4. 可测量、可持续扩展的中英文内容中心；
5. 从旧地址 `watchdeep.net/papers/` 到新域名的干净迁移。

项目应继续使用同一个 CiteDuo GitHub 仓库，不另开网站仓库，也不在服务器上直接修改源码。

---

## 3. 已确认的决策

| 编号 | 决策 | 状态 |
|---|---|---|
| D-001 | 使用 `https://citeduo.com` 作为长期主域名 | 已确认 |
| D-002 | 中英文同时按全量范围建设 | 已确认 |
| D-003 | 英文作为默认页面语言，中文使用 `/zh/` | 已确认 |
| D-004 | 现有应用继续使用 `/papers/` 路径，避免破坏深链 | 已确认 |
| D-005 | 主要产品转化是“搜索论文并通过关系发现新论文” | 已确认 |
| D-006 | 主要业务转化是用户获得价值后点击 GitHub Star | 已确认 |
| D-007 | 网站、内容、测试和部署配置进入同一个 CiteDuo 仓库 | 已确认 |
| D-008 | 不为了本次改造直接把 React/Vite 应用重写成 Next.js | 建议，待评审 |
| D-009 | 动态 App 和查询状态不作为 SEO 内容页批量索引 | 建议，待评审 |
| D-010 | 旧域名在新站稳定后再做 301，不提前断开 | 已确认执行原则 |

---

## 4. 目标

### 4.1 业务目标

- 让潜在用户通过搜索和 AI 回答发现 CiteDuo。
- 让用户在一次访问中理解 CiteDuo 与普通论文搜索、邻域引文图的区别。
- 引导用户完成一次成功的两篇论文关系探索。
- 在用户发现新论文后，提高 GitHub Star 点击和实际 Star 转化。
- 建立可信的 CiteDuo 品牌实体，不再与 TrustAgent 共用品牌语境。

### 4.2 产品目标

- 用户进入网站后，无需先自己构造查询，即可体验一个有效示例。
- 用户可以完成：

```text
搜索论文
→ 选择论文或关系
→ 查看引用网络
→ 执行关系分析
→ 打开或发现新论文
→ 点击 Star
```

- 产品页面和内容页使用一致的功能描述、限制和版本事实。
- 中英文用户可以完成同样的核心任务。

### 4.3 SEO 目标

- `citeduo.com` 根路径和核心内容页可被搜索引擎直接抓取和索引。
- 每个可索引页面有独立标题、描述、canonical 和正文。
- 中英文页面具有正确的 `hreflang`。
- `robots.txt` 和 sitemap 有效。
- 不存在的路径返回 404，不产生软 404。
- 旧域名迁移不会丢失现有查询参数和分享链接。

### 4.4 GEO 目标

- 当用户向 ChatGPT、Google AI Search、Bing Copilot、Perplexity 等平台询问“如何判断两篇论文是否相关”“Connected Papers 替代工具”“可自托管的引文网络工具”等问题时，CiteDuo 有被提及和引用的内容基础。
- AI 能准确描述 CiteDuo 的定位、功能、限制和适用场景。
- 官网和第三方资料对 CiteDuo 的事实描述一致。
- 不依赖虚假提及、批量低质页面或 prompt injection 获得可见性。

### 4.5 非目标

- 本阶段不承诺任何搜索排名或 AI 引用结果。
- 本阶段不为每一篇论文或每一个查询自动生成 SEO 页面。
- 本阶段不建设完整 CMS。
- 本阶段不进行大规模外链购买或付费目录投放。
- 本阶段不修改论文数据库的上游许可和抓取策略。

---

## 5. 当前状态基线

> 以下为 2026-11-19 历史基线；当前状态以第 0 节为准。

### 5.1 域名与基础设施

| 项目 | 当前状态 |
|---|---|
| 主域名 | `citeduo.com` |
| DNS A 记录 | `118.145.68.40` |
| AAAA 记录 | 当前未配置 |
| `www` | 与 apex 指向同一 IP |
| HTTP | 301 到 HTTPS |
| `www` HTTPS | 301 到 `https://citeduo.com` |
| TLS | Let's Encrypt，覆盖 `citeduo.com` 和 `www.citeduo.com` |
| 证书有效期 | 2027-02-17 |
| 自动续期 | Certbot 已配置 |
| 根路径 | 临时 302 到 `/papers/` |
| `/papers/` | 200，正常加载现有应用 |
| `/robots.txt` | 200，`text/plain`，当前仅允许抓取 |
| `/sitemap.xml` | 尚未实现 |
| Nginx 配置 | 已安装 `citeduo.com` vhost |
| Nginx 备份 | `/root/nginx-backups/nginx_backup_20261119_193349.tgz` |

仓库外当前留存的新域名配置：

```text
/mnt/homeair/projects/GEO/ops/nginx/citeduo.com.conf
```

该文件应在正式实施时迁入 CiteDuo 仓库的 `deploy/nginx/`。

### 5.2 应用和服务器

| 项目 | 当前状态 |
|---|---|
| 线上应用 | `https://citeduo.com/papers/` |
| 旧线上应用 | `https://watchdeep.net/papers/`，仍返回 200 |
| 前端 | React 18 + Vite 单页应用 |
| 后端 | Bun |
| 数据 | SQLite |
| 生产服务 | `connectedpapers.service`，监听 `127.0.0.1:8787` |
| 旧 Demo 服务 | `connectedpapers-demo.service`，监听 `127.0.0.1:8788` |
| 反向代理 | Nginx |
| 前端构建 base | 当前为 `/papers/` |

### 5.3 页面现状

- `/papers/` 初始 HTML 约 1.5 KB，`body` 主要只有 React 根节点。
- 实际内容需要用户搜索后才由 JavaScript 产生。
- 根路径目前没有正式 landing page。
- 当前缺少 sitemap。
- 当前缺少 canonical。
- 当前缺少 `og:url`。
- 当前 `og:image` 仍指向旧的 `watchdeep.net/paper-demo/` 路径。
- 任何不存在的 `/papers/*` 路径可能返回 SPA shell，存在软 404 风险。
- 根域名其他路径目前临时跳转到 `/papers/`。

### 5.4 仓库现状

CiteDuo 仓库已经具备：

- React 前端；
- Bun 服务端；
- API；
- 测试；
- 中文和英文 README；
- 技术文章；
- 发布与渠道研究；
- Docker 与 systemd 部署说明；
- 一个基于 rsync 的部署脚本。

现有部署脚本的关键行为：

```text
本地构建
→ rsync --delete 到 /opt/connectedpapers
→ 远端 bun install
→ systemctl restart connectedpapers
→ 健康检查
```

因此：

- GitHub 是源码和内容的源；
- 服务器 `/opt/connectedpapers` 是运行副本；
- 直接修改服务器源码会在下一次部署时被覆盖；
- 所有代码和内容改动应先进入本地仓库。

### 5.5 市场与内容现状

- 英文市场中已经有 Connected Papers、Litmaps、ResearchRabbit、Inciteful 等工具。
- Inciteful 已有 Literature Connector，可以连接两篇论文。
- CiteDuo 不应宣称“只有 CiteDuo 能连接两篇论文”。
- 更有区分度的定位是：

> 按证据类型排序、解释每一跳、展示备选路线，并支持本地优先和自托管的论文关系探索工具。

- 当前仓库已有文章和 README，但尚未作为 `citeduo.com` 的网页内容发布。
- 当前缺少 CiteDuo 在独立网站、大学指南、工具综述和社区中的外部印证。

---

## 6. 目标信息架构

### 6.1 URL 结构

第一版保持 `/papers/` 应用路径不变：

```text
https://citeduo.com/
https://citeduo.com/zh/

https://citeduo.com/papers/
https://citeduo.com/papers/?paper=<id>
https://citeduo.com/papers/?from=<id>&to=<id>

https://citeduo.com/guides/...
https://citeduo.com/zh/guides/...

https://citeduo.com/compare/...
https://citeduo.com/zh/compare/...

https://citeduo.com/docs/...
https://citeduo.com/zh/docs/...

https://citeduo.com/robots.txt
https://citeduo.com/sitemap.xml
```

### 6.2 语言规则

- 英文默认位于根路径。
- 中文统一位于 `/zh/`。
- 每个中英文页面必须有独立 URL。
- 不使用 IP 或浏览器语言自动跳转。
- 语言切换器必须保留用户当前页面语义。
- 中英文共享产品事实，不维护互相矛盾的两套功能描述。

推荐的 hreflang：

```text
英文页面：en
中文页面：zh-Hans
默认版本：x-default，指向英文页面
```

### 6.3 App 索引策略

建议：

- `/papers/` App shell 使用 `noindex,follow`。
- `?paper=`、`?from=`、`?to=` 等动态查询状态不进入 sitemap。
- 对用户有价值的具体论文关系，单独制作经过编辑的案例页。
- 案例页可以链接到对应 App 深链，但案例页自身拥有独立正文和 metadata。

待评审的替代方案：

- 为 `/papers/` 增加少量服务端渲染说明后再允许索引。
- 但不得为任意查询参数批量生成索引页。

---

## 7. 内容架构

### 7.1 首屏 Landing Page

英文根路径和中文 `/zh/` 使用同一套布局和内容模型。

建议页面结构：

1. Hero：一句核心价值和两个 CTA。
2. 可直接体验的示例论文对。
3. 搜索、关系、证据路径、发现新论文的四步说明。
4. 产品截图或短 GIF。
5. 核心差异：逐跳解释、备选路径、本地优先、自托管。
6. 谁适合使用，谁不适合使用。
7. 已知限制。
8. GitHub、许可证和部署入口。
9. 在价值说明之后提供 Star CTA。

主 CTA：

```text
Try with two example papers
用两篇示例论文体验
```

次 CTA：

```text
Star on GitHub
在 GitHub 上 Star
```

### 7.2 第一轮内容页

中英文各一份：

| 页面 | 主要意图 | CTA |
|---|---|---|
| How to check if two papers are related | 核心问题 | 用示例论文体验 |
| Citation path vs bibliographic coupling vs co-citation | 方法论 | 查看示例路径 |
| CiteDuo vs Inciteful Literature Connector | 精确比较 | 试用差异点 |
| Connected Papers alternatives | 替代方案 | 打开 CiteDuo |
| How to use citation networks in a literature review | 工作流 | 进入论文工作台 |
| Self-hosting CiteDuo | 部署和开源用户 | 查看 Docker/GitHub |

### 7.3 内容写作规则

- 先给结论，再给解释。
- 使用具体、可核实的事实。
- 明确说明适用和不适用场景。
- 技术方法和限制必须一致。
- 对比页必须公允，不贬低竞品。
- 不批量生成低差异化论文页。
- 不复制 arXiv 全文，如需引用只使用允许的摘要、元数据和自有解释。
- 每页必须有作者或维护者、更新时间、引用来源或方法说明。

---

## 8. 转化目标与事件

### 8.1 转化定义

产品转化：

```text
discovery_success
= 用户通过关系分析打开了至少一篇之前未看到的论文
```

业务转化：

```text
value_verified_star
= 用户完成一次有价值的论文发现后点击 Star
```

GitHub 实际 Star 数无法可靠归因到单次访问，因此：

- 点击 Star CTA 和 GitHub 出站作为可观测转化；
- 实际 Star 数作为周/月滞后指标；
- 不把无激活的 Star 当作主要成功标准。

### 8.2 建议事件

| 事件 | 触发时机 |
|---|---|
| `landing_view` | landing page 加载 |
| `example_open` | 用户点击示例论文对 |
| `demo_start` | 进入论文应用 |
| `paper_search_success` | 搜索成功返回结果 |
| `network_view` | 首次成功显示引用网络 |
| `relation_analysis_started` | 发起关系分析 |
| `relation_analysis_success` | 成功返回关系路径 |
| `new_paper_opened` | 用户从关系图或详情中打开新论文 |
| `star_cta_view` | Star CTA 进入可视区域 |
| `star_cta_click` | 用户点击 Star CTA |
| `github_outbound` | 跳转到 GitHub |

### 8.3 转化原则

- Star CTA 不应在首屏阻塞用户。
- 应在用户获得结果后展示。
- 不伪造紧迫感。
- 不拦截用户操作。
- 事件不记录论文搜索词、访问令牌或个人信息，除非已明确评审隐私影响。

---

## 9. 实施阶段与任务

工作量标记：

- S：半天到 1 天；
- M：1～3 天；
- L：3～5 天；
- XL：需要拆成更小任务。

内容写作和翻译另计。

### M0：仓库准备与基线确认

目标：建立干净、可测试、可审查的实施起点。

| ID | 任务 | 产物 | 工作量 | 依赖 |
|---|---|---|---|---|
| M0-1 | 从 GitHub 获取最新 CiteDuo 代码 | 本地干净工作副本 | S | 仓库访问 |
| M0-2 | 确认现有测试全部通过 | 基线测试记录 | S | M0-1 |
| M0-3 | 将本计划迁入 CiteDuo 仓库 | `docs/` 文档 | S | M0-1 |
| M0-4 | 将 Nginx 新域名配置迁入仓库 | `deploy/nginx/citeduo.com.conf` | S | 用户批准 |
| M0-5 | 建立产品事实表 | 中英文唯一事实源 | M | 内容确认 |
| M0-6 | 选择并验证示例论文对 | 两条有效深链 | M | 产品验证 |

完成标准：

- 本地仓库干净；
- 测试基线通过；
- 计划文档已进入仓库；
- 没有提交任何密钥或服务器凭据；
- 示例论文关系可重复运行。

### M1：双语站点骨架

目标：让 `citeduo.com/` 和 `/zh/` 不再只是重定向，而是服务端渲染的产品入口。

| ID | 任务 | 产物 | 工作量 | 依赖 |
|---|---|---|---|---|
| M1-1 | 设计服务端页面路由 | 路由说明 | M | M0 |
| M1-2 | 建立共享页面布局 | Header、Footer、CTA、语言切换 | M | M1-1 |
| M1-3 | 实现英文 landing | `GET /` | L | M1-2 |
| M1-4 | 实现中文 landing | `GET /zh/` | L | M1-3 |
| M1-5 | 实现页面 metadata | title、description、canonical、hreflang | M | M1-3 |
| M1-6 | 实现 Open Graph 和 Twitter Card | 新域名图片和 URL | S | M1-5 |
| M1-7 | 实现 404 | 明确未知路径语义 | S | M1-1 |
| M1-8 | 更新 Nginx 临时跳转 | 根路径改为真实页面 | S | M1-3 |

完成标准：

- `curl https://citeduo.com/` 的原始 HTML 中有 H1 和正文。
- `/zh/` 返回中文页面。
- 两页有正确的 `lang`、canonical 和 hreflang。
- 未知路径返回 404。
- `/papers/` 仍正常。

### M2：技术 SEO 基线

目标：建立可抓取、可索引、无重复状态的基础。

| ID | 任务 | 产物 | 工作量 | 依赖 |
|---|---|---|---|---|
| M2-1 | 实现 sitemap index | `/sitemap.xml` | M | M1 |
| M2-2 | 实现语言 sitemap | 英文、中文 URL 清单 | S | M2-1 |
| M2-3 | robots 指向 sitemap | `/robots.txt` | S | M2-1 |
| M2-4 | 为 App 增加 noindex 策略 | App 和查询状态 | S | M1 |
| M2-5 | 增加结构化数据 | `WebSite`、`SoftwareApplication` | M | M1 |
| M2-6 | 修复旧社交图片路径 | `citeduo.com` 资源 | S | M1 |
| M2-7 | 建立 URL 回归测试 | 200/404/redirect/canonical | M | M1 |

完成标准：

- sitemap 只包含 canonical 且允许索引的 URL。
- robots 返回 `text/plain` 并包含 sitemap。
- 动态查询页不出现在 sitemap。
- 结构化数据反映可见内容。
- 所有关键路由有自动测试。

### M3：示例体验与 Star 转化

目标：打通“搜索论文 → 关系 → 发现新论文 → Star”的路径。

| ID | 任务 | 产物 | 工作量 | 依赖 |
|---|---|---|---|---|
| M3-1 | Landing 示例 CTA | 直接打开有效论文对 | M | M0-6 |
| M3-2 | 应用内 Star 入口 | 固定入口 | S | M1 |
| M3-3 | 价值后 Star 提示 | 关系成功或发现新论文后触发 | M | M3-2 |
| M3-4 | 埋点接入 | 第 8.2 节事件 | M | M1 |
| M3-5 | GitHub 出站链接 | UTM/来源标记 | S | M3-2 |
| M3-6 | 转化测试 | 从 landing 到 Star 点击 | M | M3-1～M3-5 |

完成标准：

- 用户无需先搜索即可打开一个有效示例。
- 关系分析成功后能识别“打开新论文”动作。
- Star 提示不遮挡核心操作。
- 所有事件有测试或人工验证。

### M4：第一轮六组双语内容

目标：建立第一批能被搜索引擎和 AI 引用的主题资产。

| ID | 任务 | 产物 | 工作量 | 依赖 |
|---|---|---|---|---|
| M4-1 | 写核心问题页 | 中英文各 1 页 | L | M1 |
| M4-2 | 写方法论页 | 中英文各 1 页 | L | M1 |
| M4-3 | 写 Inciteful 对比页 | 中英文各 1 页 | L | 事实核验 |
| M4-4 | 写 Connected Papers 替代页 | 中英文各 1 页 | L | 竞品核验 |
| M4-5 | 写文献综述工作流页 | 中英文各 1 页 | L | M1 |
| M4-6 | 写自托管页 | 中英文各 1 页 | L | 部署事实 |
| M4-7 | 内容事实一致性检查 | 中英文对照表 | M | M4-1～M4-6 |

完成标准：

- 6 个主题各有完整中英文页面。
- 每个页面有唯一 metadata、canonical 和 hreflang。
- 每个页面链接到有效示例或 App。
- 所有对比和限制有事实依据。
- 不复制现有文章到多个 URL 制造重复内容。

### M5：发布、索引与外部印证

目标：让新站进入搜索引擎和 AI 可以发现的状态。

| ID | 任务 | 产物 | 工作量 | 依赖 |
|---|---|---|---|---|
| M5-1 | 接入 Google Search Console | 域名验证、sitemap 提交 | S | M2 |
| M5-2 | 接入 Bing Webmaster | 域名验证、sitemap 提交 | S | M2 |
| M5-3 | 生产部署 | 新 landing 和内容上线 | M | M1～M4 |
| M5-4 | 查询参数回归 | 深链验证 | S | M5-3 |
| M5-5 | 更新 GitHub Homepage 和 README | 指向新域名 | S | M5-3 |
| M5-6 | 建立 AI baseline | 30～50 个中英文 prompt | M | M5-3 |
| M5-7 | 开始合规外部分发 | 目录、指南、比较文章 | M | 内容就绪 |

完成标准：

- Search Console 和 Bing 能读取 sitemap。
- 官网和 GitHub 链接一致。
- 旧 App URL 仍可用。
- 已有 30～50 个固定 prompt 的基线记录。

### M6：旧域名迁移

目标：把旧地址平滑迁移到新域名，同时保留所有深链。

| ID | 任务 | 产物 | 工作量 | 依赖 |
|---|---|---|---|---|
| M6-1 | 制定 URL 映射 | 旧路径到新路径表 | S | M5 |
| M6-2 | 保留查询参数 | `?paper=`、`?from=&to=` | M | M6-1 |
| M6-3 | 配置 301 | Nginx | S | M6-2 |
| M6-4 | 更新外部旧链接 | README、文章、文档 | M | M6-3 |
| M6-5 | 监控旧地址和索引 | 迁移记录 | M | M6-3 |

完成标准：

- `watchdeep.net/papers/` 301 到正确的新地址。
- 查询参数不丢失。
- 不存在两个域名同时提供可索引重复内容的情况。
- 旧地址至少长期保留重定向。

---

## 10. 技术实施建议

### 10.1 继续使用现有仓库和服务端

建议：

- 保留 React/Vite 应用；
- 在 Bun 服务端新增服务端渲染的站点内容路由；
- 复用现有 `/stats` 服务端 HTML 渲染模式；
- 不因为 SEO 直接重写为 Next.js。

优点：

- 改动小；
- 不迁移现有 API；
- 不改变应用 base path；
- 内容页首屏 HTML 可被直接抓取；
- 符合 KISS 和 YAGNI。

### 10.2 不要把新内容放进单页应用

Landing、guides、compare、docs 默认应是：

- 独立 URL；
- 服务端返回正文；
- 独立 metadata；
- 独立 sitemap 项；
- 独立 canonical。

App 只负责交互式任务。

### 10.3 共享事实源

中英文内容必须共享：

- 产品名称；
- 一句话描述；
- 核心差异；
- 许可证；
- 功能边界；
- 数据源；
- 限制；
- 示例论文；
- GitHub 和 Demo URL。

推荐使用一个结构化内容注册表，例如：

```text
content/
├─ site.ts
├─ en/
│  ├─ home.ts
│  ├─ guides/
│  └─ compare/
└─ zh/
   ├─ home.ts
   ├─ guides/
   └─ compare/
```

也可以使用 Markdown/MDX，但第一版不应为此引入完整 CMS。

---

## 11. SEO/GEO 技术规范

### 11.1 Metadata

每个可索引页面必须有：

- `<title>`
- `<meta name="description">`
- `<link rel="canonical">`
- `og:title`
- `og:description`
- `og:url`
- `og:image`
- `twitter:card`
- `twitter:title`
- `twitter:description`
- `twitter:image`

### 11.2 Canonical

- 由页面自身 canonical 指向自身。
- 以 `https://citeduo.com` 为唯一主机。
- 不使用 `www`。
- HTTP 和 `www` 只做跳转。

### 11.3 hreflang

每对中英文页面互相配置：

```html
<link rel="alternate" hreflang="en" href="https://citeduo.com/...">
<link rel="alternate" hreflang="zh-Hans" href="https://citeduo.com/zh/...">
<link rel="alternate" hreflang="x-default" href="https://citeduo.com/...">
```

要求：

- 必须是绝对 URL；
- 必须互相指回；
- 不对自动跳转做假设；
- 每个语言版本都可直接抓取。

### 11.4 robots.txt

建议内容：

```text
User-agent: *
Allow: /

Sitemap: https://citeduo.com/sitemap.xml
```

不要屏蔽页面渲染所需 CSS、JS 或图片。

### 11.5 Sitemap

- 使用 sitemap index。
- 英文和中文可以分别列出。
- 只放 canonical、200、允许索引的 URL。
- 不包含 API、admin、stats、login、查询状态和 noindex 页面。
- 内容更新时同步更新 `lastmod`。

### 11.6 404 和重定向

- 不存在的页面返回 404。
- 测试路径不得被 SPA fallback 伪装成 200。
- 永久页面迁移使用 301。
- 临时入口使用 302。
- 查询参数在重定向时保留。

### 11.7 结构化数据

建议使用：

- `WebSite`
- `SoftwareApplication`
- `Article`
- `BreadcrumbList`

要求：

- 只描述页面可见内容；
- `codeRepository` 和 `license` 准确；
- 不使用不存在的评分、评论或价格；
- 结构化数据通过基础语法验证。

---

## 12. 测试计划

### 12.1 自动化测试

至少运行：

```bash
bun run test:server
bun run typecheck:server
pnpm --dir academic-paper-explorer test
pnpm --dir academic-paper-explorer typecheck
pnpm --dir academic-paper-explorer lint
pnpm --dir academic-paper-explorer build
```

### 12.2 HTTP 验收

```text
GET /                         200，英文正文和 H1
GET /zh/                      200，中文正文和 H1
GET /robots.txt               200，text/plain，包含 sitemap
GET /sitemap.xml              200，XML
GET /definitely-not-found     404
GET /papers/                  200，应用正常
GET /papers/?paper=<id>       200，参数保留
GET /papers/?from=<id>&to=<id> 200，参数保留
GET http://citeduo.com/       301 到 HTTPS
GET https://www.citeduo.com/  301 到 apex
```

### 12.3 浏览器验收

- 中英文页面视觉一致；
- 语言切换正确；
- 移动端可用；
- 示例论文 CTA 能打开有效关系；
- Star CTA 不遮挡操作；
- `/papers/` 现有功能无回归；
- 页面无关键控制台错误。

### 12.4 SEO 验收

- 页面源码中直接存在核心正文；
- 标题不重复；
- canonical 正确；
- hreflang 互相匹配；
- sitemap 没有 noindex URL；
- OG 图片可访问且域名正确；
- Google Search Console/Bing 无抓取阻止。

### 12.5 性能目标

代表性页面目标：

- LCP 小于 2.5 秒；
- CLS 小于 0.1；
- INP 小于 200 ms；
- 首屏不加载 3D 依赖；
- 图片经过压缩并设置尺寸。

---

## 13. Git、审查与部署流程

### 13.1 Git 原则

- 不直接修改服务器源码。
- 不直接向 `main` 推送未审查的大型改动。
- 不在没有明确授权时自动 `commit` 或 `push`。
- 不提交任何密钥、Token、私钥或生产 `.env`。
- 每个 PR 必须聚焦一个可验收目标。

### 13.2 推荐分支

```text
feat/citeduo-public-site
```

如果任务较大，可以拆为：

```text
feat/site-foundation
feat/star-conversion
content/bilingual-launch-pages
chore/domain-migration
```

### 13.3 推荐提交边界

1. 文档、站点路由骨架和测试；
2. 中英文 landing；
3. sitemap、canonical、hreflang、结构化数据；
4. 示例和 Star 转化；
5. 内容页；
6. 域名迁移。

### 13.4 部署步骤

```text
本地测试
→ 构建
→ 预览环境
→ 用户审查
→ 合并
→ bun run deploy
→ HTTP/浏览器/App 回归
```

### 13.5 回滚

- Git 回滚最近一次发布；
- 重新执行部署脚本；
- Nginx 配置使用 `/root/nginx-backups/` 中的最近备份；
- 回滚后重新执行 `nginx -t`、reload、TLS 和 `/papers/` 验证。

---

## 14. 外部平台与 GEO 监测

### 14.1 平台

- Google Search Console；
- Bing Webmaster Tools；
- Google Analytics 或现有第一方统计；
- GitHub Insights；
- ChatGPT Search；
- Google AI Search；
- Bing Copilot；
- Perplexity。

### 14.2 初始 prompt 集

建议中英文各 15～25 个，覆盖：

- 如何判断两篇论文是否相关；
- 两篇论文之间的引用链怎么查；
- 文献综述中的 citation chaining；
- Connected Papers alternatives；
- Inciteful Literature Connector alternative；
- 开源引文网络工具；
- self-hosted citation network explorer；
- local-first literature review tool。

### 14.3 监测字段

```text
日期
引擎
语言
地区
Prompt
是否提及 CiteDuo
是否引用 citeduo.com
引用 URL
品牌描述是否准确
推荐位置或语境
竞品
事实错误
备注
```

### 14.4 复核频率

- 发布后第 1 周：检查抓取和索引；
- 第 2 周：检查 sitemap、canonical 和查询参数；
- 第 4 周：首次比较 SEO/GEO baseline；
- 之后每月一次，至少重复 3 次抽样。

---

## 15. 所需资料与前提

### 15.1 权限

- GitHub 仓库读写权限；
- 允许创建 feature branch 和 PR；
- 明确是否允许提交和推送；
- 服务器 SSH 权限；
- DNS 管理权限；
- Certbot/Nginx 管理权限；
- Google Search Console 权限；
- Bing Webmaster 权限；
- GitHub 仓库 Homepage 修改权限。

### 15.2 品牌资料

- CiteDuo 最终名称和大小写；
- 品牌颜色与字体；
- favicon；
- logo 或文字标识；
- 1200×630 左右的 OG 图片；
- 产品截图；
- 示例 GIF；
- 中英文一句话描述。

### 15.3 产品事实

- 当前版本；
- MIT 许可证；
- 支持的数据源；
- 支持的系统与部署方式；
- 隐私和本地优先说明；
- 自托管限制；
- arXiv 内容限制；
- AI 助手的启用条件；
- 关系边类型和置信度；
- 已知缺陷和未完成能力。

### 15.4 内容资料

- 英文 README；
- 中文 README；
- 技术文章；
- 发布文章；
- 架构说明；
- 部署说明；
- 已验证的两篇论文示例；
- 竞品事实来源；
- 引文关系和术语解释。

### 15.5 分析资料

- 当前搜索索引状态；
- 当前引用来源；
- 当前 Demo 访问数据；
- GitHub Star/Fork/Issue 基线；
- 目标竞品清单；
- 关键词和 prompt 清单；
- 任何现有用户反馈。

### 15.6 阻塞项

以下资料缺失会阻塞对应阶段：

- 未确认仓库写权限：阻塞 M0；
- 未确认是否允许 commit/push：阻塞正式交付；
- 未提供可验证示例论文对：阻塞 M3；
- 未确定分析平台：阻塞 M3 埋点；
- 未提供 Search Console/Bing 权限：阻塞 M5；
- 未完成中英文事实校对：阻塞 M4。

---

## 16. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 直接修改生产服务器 | 下次部署覆盖，无法追踪 | 所有源码进入 Git |
| 双语内容漂移 | 用户和 AI 获得冲突信息 | 单一事实源和内容对照审查 |
| hreflang 配置错误 | 搜索引擎选错版本 | 自动检测互相引用 |
| 动态查询页被索引 | 大量薄页面和重复内容 | App noindex，查询 URL 不进 sitemap |
| 过早迁移旧域名 | 分享链接和索引中断 | 新站验收后再 301 |
| Star 归因不完整 | 只能看到点击，无法精确看到 Star | 点击与 GitHub 总数分层衡量 |
| AI 回答不稳定 | 单次抽样误判 | 固定 prompt、重复采样、看趋势 |
| 外部比较页事实不准确 | 损害可信度 | 事实来源、日期和竞品核验 |
| 共享 Nginx 配置影响其他站点 | 其他产品中断 | 备份、`nginx -t`、只改独立 vhost |
| 提交密钥 | 安全事故 | `.gitignore`、提交前 secret scan |
| 批量低质 AI 内容 | SEO/GEO 风险 | 只发布有原创价值和事实依据的页面 |

---

## 17. Handoff 清单

> 本节为 2026-11-19 原始清单；已完成项以第 0 节和仓库当前 `main` 为准。

### 17.1 已完成

- [x] 确认 CiteDuo 主域名为 `citeduo.com`。
- [x] 配置并验证 DNS。
- [x] 为 apex 和 `www` 签发 TLS 证书。
- [x] 配置 HTTP 到 HTTPS。
- [x] 配置 `www` 到 apex 的 301。
- [x] 配置新域名临时入口。
- [x] 验证 `https://citeduo.com/papers/` 可加载。
- [x] 验证查询参数可以传输。
- [x] 验证旧地址仍为 200。
- [x] 备份生产 Nginx 配置。

### 17.2 进行中或待开始

- [ ] 将本文件迁入 CiteDuo 仓库。
- [ ] 将 Nginx 配置迁入仓库。
- [ ] 建立产品事实表。
- [ ] 验证示例论文对。
- [ ] 实现双语 landing page。
- [ ] 移除根路径临时 302。
- [ ] 实现 sitemap 和 canonical。
- [ ] 实现 hreflang。
- [ ] 加入 Star 转化链路。
- [ ] 发布第一轮内容页。
- [ ] 接入 Search Console 和 Bing Webmaster。
- [ ] 建立 AI baseline。
- [ ] 更新 GitHub 和 README。
- [ ] 迁移旧 `/papers/` 地址。

### 17.3 接手后的第一批动作

1. 阅读本文档和 CiteDuo README。
2. 获取最新仓库并确认测试基线。
3. 确认是否允许创建分支、提交和推送。
4. 将 Nginx 配置和本文档纳入仓库。
5. 建立产品事实表和示例论文对。
6. 实施 M1 和 M2。
7. 在预览环境完成验收后再替换根路径临时 302。

### 17.4 不要做的事

- 不要直接在 `/opt/connectedpapers` 修改源码。
- 不要在未备份时修改共享 Nginx 配置。
- 不要在 landing page 就绪前重定向旧 `/papers/`。
- 不要把查询状态批量加入 sitemap。
- 不要为每个论文自动生成薄页面。
- 不要让中英文页面共享同一个 title 和 canonical。
- 不要把 API Key、私钥或生产 `.env` 提交到 GitHub。
- 不要在未明确授权时自动 `git commit` 或 `git push`。

---

## 18. Definition of Done

第一版 SEO/GEO 公共站点完成需同时满足：

### 内容

- 英文 landing 和中文 `/zh/` 完成；
- 六组核心内容页完成；
- 中英文事实一致；
- 每个页面有明确 CTA。

### 技术

- 页面首屏 HTML 有正文；
- canonical、hreflang、OG、结构化数据正确；
- robots 和 sitemap 正确；
- 未知路径返回 404；
- `/papers/` 和所有查询深链无回归。

### 转化

- 示例论文入口有效；
- `discovery_success` 可观测；
- Star CTA 在价值后出现；
- Star 点击和 GitHub 出站可统计。

### SEO/GEO

- Search Console 和 Bing 已接入；
- sitemap 已提交；
- 30～50 个 prompt 已完成 baseline；
- 外部描述与官网一致；
- 至少开始合规的外部内容分发。

### 发布

- 通过 PR 审查；
- 通过自动化测试；
- 通过预览验收；
- 生产 smoke test 通过；
- 有可执行回滚路径。

---

## 19. 附录 A：建议页面路由

```text
/
/zh/

/papers/

/guides/how-to-check-if-two-papers-are-related
/guides/citation-path-bibliographic-coupling-co-citation
/guides/literature-review-citation-network

/zh/guides/how-to-check-if-two-papers-are-related
/zh/guides/citation-path-bibliographic-coupling-co-citation
/zh/guides/literature-review-citation-network

/compare/citeduo-vs-inciteful-literature-connector
/compare/connected-papers-alternatives

/zh/compare/citeduo-vs-inciteful-literature-connector
/zh/compare/connected-papers-alternatives

/docs/self-hosting
/zh/docs/self-hosting
```

最终 URL 应由实现评审确认，但必须保持稳定。

---

## 20. 附录 B：页面内容 Brief 模板

```text
页面名称：
语言：
URL：
主要搜索意图：
目标用户：
一句话答案：
必须出现的事实：
需要的证据或来源：
适用场景：
不适用场景：
中英文对应页：
主 CTA：
次 CTA：
canonical：
hreflang：
OG 图片：
结构化数据类型：
作者/维护者：
更新时间：
验收人：
```

---

## 21. 附录 C：发布 Smoke Test

```bash
curl -I https://citeduo.com/
curl -I https://citeduo.com/zh/
curl -I https://citeduo.com/papers/
curl -I "https://citeduo.com/papers/?paper=1706.03762"
curl -I "https://citeduo.com/papers/?from=<paper-a>&to=<paper-b>"
curl -I https://citeduo.com/robots.txt
curl -I https://citeduo.com/sitemap.xml
curl -I https://citeduo.com/definitely-not-found
curl -I http://citeduo.com/
curl -I https://www.citeduo.com/
```

预期结果需与第 12.2 节一致。

---

## 22. 最终交接说明

当前基础设施已经完成了“域名可达”的部分，但还没有完成“产品可发现”和“转化可衡量”的部分。

接手人不应把根路径临时 302 当成最终方案。第一项实质性工程任务应是：

> 在 CiteDuo 仓库中实现服务端渲染的中英双语 landing page，并同时建立 canonical、hreflang、robots、sitemap、示例论文 CTA 和 Star 转化埋点。

完成这项任务后，再进入内容扩展、搜索平台提交、外部印证和旧域名迁移。

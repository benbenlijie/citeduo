# ICP 备案与上线准备清单（`citeduo.com`）

> 更新日期：2026-11-21
> 适用场景：继续使用火山引擎大陆节点，先完成 ICP 备案，再开放 `citeduo.com`。
> 说明：具体材料、审核时长和页面文案以火山引擎备案控制台及管局最新要求为准；本文档只整理工程侧需要准备和验收的事项。

## 1. 当前状态

- 源站、Nginx 配置、双语 SSR 页面、sitemap、robots、404 和 `/papers/` 深链已在生产服务器准备完成。
- `citeduo.com` 当前被火山引擎未备案域名网关拦截：HTTP 302 到 `webblock.volcengine.com`，HTTPS 在 TLS 阶段被重置。
- 当前在线 Demo 继续使用 `https://watchdeep.net/papers/`。
- 备案期间不要启用 `watchdeep.net` 到 `citeduo.com` 的 301，也不要向 Search Console/Bing 提交新域名 sitemap。

## 2. 备案材料清单

### 2.1 个人主体

- 负责人身份证正反面。
- 负责人手机号、常用邮箱和应急联系方式。
- 域名证书或域名持有证明。
- 火山引擎账号及可用的备案服务码。
- 网站名称、网站简介、服务内容和服务语言。
- 按要求完成人脸核验、幕布拍照或电子核验。

### 2.2 企业主体

- 营业执照或组织机构证明。
- 法定代表人身份证。
- 网站负责人身份证、手机号和邮箱。
- 授权书（网站负责人不是法定代表人时）。
- 域名证书、火山引擎账号和备案服务码。
- 网站名称、服务内容、服务语言和联系人信息。

### 2.3 网站信息建议

- 网站名称：`CiteDuo` 或与主体一致的规范名称。
- 网站简介：开源学术论文关系探索工具，提供论文搜索、引用网络和两篇论文关联分析。
- 服务内容：学术工具、文献检索、引用关系分析；不要填写与实际功能不符的经营性内容。
- 语言：中文、英文。
- 是否涉及用户生成内容、论坛、直播、交易、新闻等：按实际功能如实选择。

## 3. 火山引擎备案流程

1. 登录火山引擎控制台，进入 ICP 备案。
2. 新增备案，填写主体信息和网站信息。
3. 上传材料并完成真实性核验。
4. 提交火山引擎初审；按控制台提示补正。
5. 初审通过后提交管局审核。
6. 审核通过后获取 ICP 备案号。
7. 按属地要求完成公安联网备案（如适用）。

> 备案期间保持域名解析和服务器不变；不要在审核过程中把 `citeduo.com` 切换到海外入口或删除现有源站配置。

## 4. 备案期间可以继续做的事

- 继续完善中英文内容页和事实一致性。
- 在本地或 `watchdeep.net/papers/` 验证应用功能。
- 运行 `bun run test:server`、前端测试、typecheck、lint 和构建。
- 验证示例论文对和两篇论文关系分析。
- 准备 Search Console/Bing 账号和验证方式，但不要提交未放行的 sitemap。
- 准备 GEO prompt 基线和外部分发素材。
- 检查 Nginx、证书、systemd 和回滚路径。

## 5. 备案通过后的上线顺序

### 5.1 代码与构建

1. 将备案号加入站点页脚，并链接到 `https://beian.miit.gov.cn/`。
2. 使用正式域名构建：

```bash
VITE_BASE=/papers/ \
VITE_PUBLIC_ORIGIN=https://citeduo.com \
bun run build:web
```

3. 确认构建产物中的 `og:url`、`og:image` 和 `twitter:image` 都指向 `https://citeduo.com`。

### 5.2 部署

1. 备份 `/etc/nginx`。
2. 安装或更新 `deploy/nginx/citeduo.com.conf`。
3. 执行 `nginx -t`，通过后 reload。
4. 部署最新应用并重启 `connectedpapers.service`。

### 5.3 HTTP 验收

```bash
curl -sI https://citeduo.com/
curl -sI https://citeduo.com/zh/
curl -sI https://citeduo.com/about
curl -sI https://citeduo.com/guides/
curl -sI https://citeduo.com/compare/
curl -sI https://citeduo.com/docs/
curl -sI https://citeduo.com/papers/
curl -sI "https://citeduo.com/papers/?paper=2304.02643&from=2304.02643&to=2410.24164"
curl -s https://citeduo.com/robots.txt
curl -sI https://citeduo.com/sitemap.xml
curl -s https://citeduo.com/llms.txt
curl -sI https://citeduo.com/definitely-not-found
curl -sI http://citeduo.com/
curl -sI https://www.citeduo.com/
```

预期：首页、中文页、About、三个分类聚合页和 `/papers/` 深链均为 200；`robots.txt` 包含 sitemap；sitemap 为 XML（当前中英文各 12 个 URL）；`llms.txt` 可读；未知路径 404；HTTP 和 `www` 正确跳转。

### 5.4 站长平台

1. Google Search Console 验证 `citeduo.com`。
2. Bing Webmaster Tools 验证 `citeduo.com`。
3. 提交 `https://citeduo.com/sitemap.xml`。
4. 检查抓取统计、canonical、hreflang 和 404。

### 5.5 GEO baseline

使用 `docs/seo-geo/geo-monitoring-prompts-and-baseline.md` 中的固定问题集，记录发布后第 1 周、第 2 周和第 4 周的结果。

## 6. 旧域名迁移

只有在新站满足以下条件后，才启用 `watchdeep.net` 的 301：

- `citeduo.com` 连续稳定可访问。
- 首页、中文页、About、分类聚合页、14 篇内容页和 `/papers/` 深链验收通过。
- Search Console 和 Bing 已接入。
- 旧地址查询参数映射通过。
- 已准备回滚路径。

映射和切换步骤见 `docs/seo-geo/domain-migration-map.md`。

## 7. 回滚

- 保留最近一次 `/etc/nginx` 备份。
- 保留上一版前端构建和上一版部署目录。
- 回滚后重新执行 `nginx -t`、reload、TLS 检查和 `/papers/` 深链检查。
- 如果新域名刚上线，不要立即删除旧域名入口；先恢复旧地址可用性，再排查。

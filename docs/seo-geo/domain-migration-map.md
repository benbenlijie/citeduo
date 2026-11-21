# 旧地址迁移映射与发布核对单（`watchdeep.net` → `citeduo.com`）

> 更新日期：2026-11-19  
> 执行原则（决策 D-010）：**必须等 `https://citeduo.com` 新站上线、HTTP/浏览器回归通过并接入 Search Console 与 Bing Webmaster 后，才在 `watchdeep.net` 启用 301 重定向，绝不提前断开。**
>
> 备案期间的工程准备和放行后验收见 [`icp-filing-and-launch-readiness.md`](./icp-filing-and-launch-readiness.md)。

## 1. URL 永久重定向映射表（M6-1 / M6-2）

| 旧地址模式 | HTTP 状态 | 目标新地址模式 | 查询参数保留要求 |
|---|---|---|---|
| `https://watchdeep.net/papers` | `301` | `https://citeduo.com/papers/` | 完整保留（如 `?from=2304.02643&to=2410.24164`） |
| `https://watchdeep.net/papers/` | `301` | `https://citeduo.com/papers/` | 完整保留（`?paper=...`、`?from=...&to=...`、`?d=...&mn=...`） |
| `https://watchdeep.net/papers/read/<arxivId>` | `301` | `https://citeduo.com/papers/read/<arxivId>` | 完整保留（如 `?pid=...`） |
| `https://watchdeep.net/papers/<subpath>` | `301` | `https://citeduo.com/papers/<subpath>` | 完整保留 |
| `https://watchdeep.net/paper-demo` | `301` | `https://citeduo.com/papers/` | 完整保留历史文章中的旧链接 |
| `https://watchdeep.net/paper-demo/<subpath>` | `301` | `https://citeduo.com/papers/<subpath>` | 完整保留 |
| `https://watchdeep.net/` 及其余非论文路径 | 不改动 | 保持原站点行为 | 不影响共享服务器上的其他产品 |

## 2. 上线与切换顺序（M5 → M6）

1. **部署最新应用与站点路由**：使用 `VITE_BASE=/papers/ bun run deploy` 同步最新构建至生产主机。
2. **启用 `citeduo.com` 正式 Nginx 配置**：将 `deploy/nginx/citeduo.com.conf` 安装至 `/etc/nginx/sites-available/citeduo.com`（先备份 `/etc/nginx`），执行 `nginx -t && systemctl reload nginx`。
3. **新站全量 HTTP 验收**：
   - `curl -sI https://citeduo.com/` 返回 `200` 且含英文 `<h1>`；
   - `curl -sI https://citeduo.com/zh/` 返回 `200` 且含中文 `<h1>`；
   - `curl -s https://citeduo.com/robots.txt` 包含 `Sitemap: https://citeduo.com/sitemap.xml`；
   - `curl -sI https://citeduo.com/sitemap.xml` 返回 `200` XML；
   - `curl -sI https://citeduo.com/definitely-not-found` 返回 `404`；
   - `curl -sI "https://citeduo.com/papers/?paper=2304.02643&from=2304.02643&to=2410.24164"` 返回 `200` 且带 `X-Robots-Tag: noindex, follow`。
4. **提交站长平台（M5-1 / M5-2）**：在 Google Search Console 与 Bing Webmaster Tools 验证 `citeduo.com` 并提交 `https://citeduo.com/sitemap.xml`。
5. **切换旧域名 301（M6-3）**：确认新站稳定后，将 `deploy/nginx/watchdeep-papers-migration.conf.snippet` 合入 `watchdeep.net` vhost，`nginx -t && systemctl reload nginx`，验证深链参数无损跳转。

## 3. 2026-11-19 生产实测发现的关键公网阻塞项（火山引擎未备案域名拦截）

- **源站状态（已就绪）**：生产服务器 `118.145.68.40` 上 `connectedpapers.service` 与 `/etc/nginx/sites-available/citeduo.com.conf` 已全部生效，本机 `--resolve citeduo.com:443:127.0.0.1` 验收 28 项路由（`/`、`/zh/`、12 篇双语内容页、`robots.txt`、`sitemap.xml`、`404`、`/papers/` 深链、转化埋点 `204`）全部通过。
- **公网状态（被机房网关拦截）**：由于 `118.145.68.40` 位于中国大陆火山引擎（Volcengine）节点，而新域名 `citeduo.com` 尚未在该云厂商完成 ICP 备案接入，外部公网访问 `http://citeduo.com/` 被网关 `Server: Suzaku` 拦截至 `https://webblock.volcengine.com`，`https://citeduo.com/` 在 TLS ClientHello 阶段被网关重置连接（`Connection reset by peer`）。
- **处置策略**：
  1. 严格保持 `https://watchdeep.net/papers/`（HTTP 200）作为当前可用的在线 Demo 入口，暂不修改 GitHub Homepage，也绝不启用 `watchdeep.net` 301 跳转；
  2. 解除公网拦截二选一：**方案 A** 在火山引擎完成 `citeduo.com` 的 ICP 备案接入；**方案 B** 将 `citeduo.com` 托管至海外节点 / Cloudflare Tunnel / 海外反向代理机器（无需大陆 80/443 入站备案网关），即可立即对外开放。

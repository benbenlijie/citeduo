# 本地部署与运行指南

本项目为本地优先应用：单个 Bun 进程同时提供 API 与前端静态文件，数据保存在本地 SQLite（`data/app.db`）。本文说明如何在本机初始化、构建并常驻运行。

## 环境要求

- **Bun** ≥ 1.3
- **pnpm** 9
- **opencode**（可选，AI 助手需要）：安装后 `opencode --version` 应正常输出版本（本特性按 1.18.33 验证）。

## 1. 初始化

```bash
git clone <repo> && cd citeduo
bash scripts/setup.sh
```

脚本会：检查 Bun/pnpm、创建 `data/` 目录、在缺失时从 `server/.env.example` 复制出 `server/.env`、安装前端依赖。

如需使用 Semantic Scholar API key，编辑 `server/.env`：

```env
SEMANTIC_SCHOLAR_API_KEY=your_key_here   # 可选
CONTACT_EMAIL=you@example.com
PORT=8787
```

## 2. 构建前端

```bash
bun install        # 后端运行时依赖（unpdf：PDF 兜底解析、纯 JS 无需 poppler）
bun run build:web
```

产物输出到 `academic-paper-explorer/dist/`，由后端进程托管。

> 阅读器遇到没有 arXiv HTML 版的论文时，会按「arXiv HTML → ar5iv → PDF 文本 → 摘要」
> 逐级回退（后端 `GET /api/reader/:arxivId`）。PDF 抽取依赖 `unpdf`；漏装时该级自动跳过，
> 只显示摘要，服务仍能正常启动。`scripts/deploy.sh` 会在同步后自动在远端执行
> `bun install --frozen-lockfile --production`（可用 `SKIP_INSTALL=1` 跳过）。

## 3. 启动服务

```bash
bun run server
```

默认监听 `http://127.0.0.1:8787`。换端口：

```bash
PORT=9000 bun run server
```

### AI 助手（opencode agent，可选）

阅读器内的 AI 助手依赖 `opencode`：

- 服务端启动时会尝试拉起 `opencode serve`（复用 `LLM_PROVIDERS` 中第一个 `kind: "openai"` 条目）。`opencode` 必须在 `PATH` 中，或用 `OPENCODE_BIN=/绝对路径/opencode` 指定；否则启动日志会打印 `[opencode] failed to start`。
- 需要至少配置一个 `openai` provider（见 README 的 LLM provider 一节），否则 AI 接口返回 `503`。
- 健康检查：opencode 不可用（未安装、`OPENCODE_ENABLED=0` 或未配置 provider）时，`POST /api/ai/session` 返回 `503`；翻译功能不受影响。
- 运行时隔离在 `data/opencode-runtime/`（已随 `data/` 忽略），可安全删除；服务重启会重建。

### AI 助手：外部 opencode 模式（本机跑 opencode，服务器只连接）

如果部署机不值得/不方便常驻 opencode（例如 2GB 小机器），可以让 opencode 跑在你的本机，服务器通过反向 SSH 隧道连接：

**服务器 `server/.env`**
```env
OPENCODE_BASE_URL=http://127.0.0.1:4096   # 不再本地 spawn，连接隧道里的本机 opencode
INTERNAL_TOKEN=一段足够长的随机串          # 与下面的本机 runner 必须一致
```

**本机**（opencode 与工具回调在服务器侧执行；工具抓正文时回调服务器公网 API）
```bash
# 1) 常驻运行本机 opencode（独立 runtime，端口 4097，避免和本地开发冲突）
OPENCODE_PORT=4097 \
PAPER_API_BASE=https://watchdeep.net/papers/api \
INTERNAL_TOKEN=<与服务器一致> \
bun --env-file=server/.env run scripts/opencode-local.ts

# 2) 反向隧道：把本机 4097 暴露到服务器的 127.0.0.1:4096（仅 loopback）
autossh -M 0 -N -T -o ServerAliveInterval=15 -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes -R 127.0.0.1:4096:127.0.0.1:4097 webserver
```

建议用 systemd user 服务常驻这两条（参考 `citeduo-mtcode-tunnel.service`）。若本机关机/断网，AI 助手不可用，翻译不受影响。

## 4. 常驻运行（可选）

### nohup

```bash
nohup bun run server > server.log 2>&1 &
```

### systemd（用户级服务示例）

创建 `~/.config/systemd/user/citeduo.service`：

```ini
[Unit]
Description=CiteDuo local server
After=network.target

[Service]
WorkingDirectory=%h/Documents/projects/citeduo
ExecStart=/usr/bin/env bun run server
Restart=on-failure

[Install]
WantedBy=default.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now citeduo.service
```

## 注意事项

- **默认只监听 `127.0.0.1`**：服务仅本机可访问。不要绑定 `0.0.0.0`，除非你明确需要并已配置防火墙/反向代理来保护它。
- 数据保存在 `data/app.db`；备份/迁移时连同该文件一起处理。
- 更新代码后需要重新执行 `bun run build:web` 再重启服务。
- 前端未构建时，根路径会返回提示 JSON，提示先运行 `bun run build:web`。

## 5. 公网部署（nginx + 域名 watchdeep.net）

> ⚠️ 本应用**无内置账号体系**。直接暴露公网会让任何人都能消耗你的 LLM/S2 额度。务必：**开 `ACCESS_TOKEN`**（口令）并**只经 HTTPS 反向代理**访问。

### 5.1 DNS
在域名服务商为 `watchdeep.net`（及 `www`）添加 **A 记录**指向你的服务器公网 IP。

### 5.2 服务器准备
```bash
# 安装 Bun / pnpm（见官方文档），然后：
git clone <repo> && cd citeduo
bash scripts/setup.sh
bun run build:web
```

编辑 `server/.env`：
```env
ACCESS_TOKEN=换成一段足够长的随机口令
TRUST_PROXY=1
HOST=127.0.0.1
PORT=8787
CONTACT_EMAIL=你的邮箱
SEMANTIC_SCHOLAR_API_KEY=...        # 可选，更稳
OPENALEX_API_KEY=...               # 可选，摆脱匿名限流
LLM_PROVIDERS=[...]                # 翻译/AI 需要
OPENCODE_BIN=/usr/local/bin/opencode  # AI 助手需要；不在 PATH 时填绝对路径
# OPENCODE_ENABLED=0              # 设为 0 可关闭 AI 助手（保留翻译）
```

### 5.3 systemd 常驻（系统级）
`/etc/systemd/system/citeduo.service`：
```ini
[Unit]
Description=CiteDuo
After=network.target

[Service]
User=www-data
WorkingDirectory=/srv/citeduo
ExecStart=/home/www-data/.bun/bin/bun run server
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload && sudo systemctl enable --now citeduo
```

### 5.4 nginx 反向代理
`/etc/nginx/sites-available/watchdeep.net`：
```nginx
server {
    listen 80;
    server_name watchdeep.net www.watchdeep.net;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # 建图任务最长约 45s，轮询期间保持连接
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/watchdeep.net /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 5.5 HTTPS 证书（Let's Encrypt）
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d watchdeep.net -d www.watchdeep.net
```
certbot 会自动改写为 443 并启用跳转与自动续期。

### 5.6 防火墙
```bash
sudo ufw allow 80,443/tcp
sudo ufw deny 8787/tcp   # 应用端口不对外
```

### 5.7 访问
浏览器打开 `https://watchdeep.net/?token=你的口令` 一次，服务端写入 Cookie 后会跳转到 `https://watchdeep.net/`，之后正常使用。

### 5.8 备份与更新
```bash
cp data/app.db data/app.db.bak        # 备份
git pull && bun run build:web && sudo systemctl restart citeduo
```

### 5.9 使用统计

访问 `https://watchdeep.net/papers/stats`（子路径部署时）查看第一方统计；数据写在同一个 `data/app.db` 的 `usage_events` 表里，不接第三方，不存原始 IP/UA。

- 与主应用共用 `ACCESS_TOKEN`；想让统计页用独立口令，在 `server/.env` 加 `ADMIN_TOKEN=一段随机口令`，然后打开一次 `https://watchdeep.net/papers/stats?token=那段口令`，服务端会写入独立 Cookie。
- 不想收集时设 `ANALYTICS_ENABLED=0` 并重启。
- 页面浏览由前端在 SPA 路由变化时上报；搜索、建图、翻译、AI 等由服务端记录。日志轮转不影响统计，因为数据在 SQLite 里。
- 备份时连同 `data/app.db` 一起备份；`usage_events` 表由启动时的 schema 自动创建。

### 5.10 公开 Demo 模式（每日预算 + 报警）

把站点放开给外网时，不要让 `ACCESS_TOKEN` 为空却没有预算保护。推荐配置：

```env
# 应用公开；看板和管理接口仍然要这个口令
ACCESS_TOKEN=
ADMIN_TOKEN=换一段新的随机口令

DEMO_PUBLIC=1
DEMO_DAILY_VISITOR_LIMIT=300
DEMO_DAILY_REQUEST_LIMIT=5000
DEMO_BLOCK_ON_LIMIT=1

# 报警：generic / slack / discord / feishu；不填则只写 journal
DEMO_ALERT_FORMAT=generic
DEMO_ALERT_WEBHOOK=

# 默认保留全部功能。若要降低 arXiv 条款或 LLM 账单风险，再换成下面这套：
# PAPER_CONTENT_MODE=off
# LLM_PROVIDERS=[{"name":"browser","kind":"browser"}]
# OPENCODE_ENABLED=0
```

口径：

- 预算统计 HTML 导航 + `/api/*` 请求，不统计静态资源；同一匿名 Cookie 每天只算一个访客。
- 请求数或访客数超过上限后，当天后续页面/API 返回 `429`，本地时间次日 00:00 自动重置。
- 带 `ADMIN_TOKEN` 的请求（Cookie、`?token=` 或 `Authorization: Bearer`）不受预算限制，方便你自己排查。
- 超限只报警一次；报警内容写入 journal，配置 webhook 后会同时推送。
- 紧急放行/查看状态（`ADMIN_TOKEN` 从服务器 `.env` 读取，不要贴到公开地方）：

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://watchdeep.net/papers/api/admin/demo-quota
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" https://watchdeep.net/papers/api/admin/demo-quota/reset
```

公开 demo 保留全部功能时，匿名用户可以直接调用服务端 AI/翻译。务必在 LLM provider 后台设置消费上限、使用可随时吊销的 key，并定期轮换；`DEMO_PUBLIC=1` 只负责每日预算和看板口令，不会拒绝 `/api/translate` 或 `/api/ai/*`。`PAPER_CONTENT_MODE=full` 还意味着服务器会缓存并向公众提供 arXiv 全文，需自行确认符合 arXiv 使用条款；更保守的部署用 `off`，浏览器仍会直接加载 arXiv 提供的 HTML。

## 6. 子路径挂载（例如 https://watchdeep.net/papers/）

若不想占用域名根（根已被其他站点使用），可挂到子路径：

1. 构建时指定 base：`VITE_BASE=/papers/ bun run build:web`（前端资源与 API 会走 `/papers/...`）
2. `server/.env` 增加：`BASE_PATH=/papers`（用于 `?token=` 登录后重定向回子路径）
3. 反向代理（nginx，注意 `proxy_pass` 末尾的 `/` 会剥离前缀）：

```nginx
location /papers/ {
    proxy_pass http://127.0.0.1:8787/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 300s;
}
```

访问 `https://你的域名/papers/?token=口令` 即可。

## 7. 快速更新（本地改完一键发布）

先配置一次部署目标。`scripts/deploy.env` 已被 git 忽略，主机名与内网路径不会进入公开仓库：

```bash
cp scripts/deploy.env.example scripts/deploy.env
$EDITOR scripts/deploy.env      # REMOTE / DIR / VITE_BASE / SERVICE / PUBLIC_URL
```

之后日常改完代码：

```bash
bun run deploy          # = bash scripts/deploy.sh
```

脚本会：按 `VITE_BASE` 构建前端 → `rsync` 同步（排除 .git/node_modules/data/server/.env/docs）→ 远端 `bun install --frozen-lockfile --production` → `systemctl restart $SERVICE` → 健康检查 `$PUBLIC_URL`（留空则跳过）。

常用变体（环境变量优先于 `deploy.env`）：

```bash
SKIP_WEB=1 bun run deploy      # 只改了后端/配置，跳过前端构建
SKIP_INSTALL=1 bun run deploy  # 依赖没变，跳过远端 bun install
SKIP_RESTART=1 bun run deploy  # 只同步，不重启
REMOTE=other-host DIR=/srv/app VITE_BASE=/base/ bun run deploy
```

参数见 `scripts/deploy.sh` 头部。查看访问口令：`ssh "$REMOTE" "grep ^ACCESS_TOKEN= $DIR/server/.env"`。

## 验证

启动后访问 `http://127.0.0.1:8787`，确认：页面正常加载、搜索可用、论文详情正常、网络图可生成。

## 帮助

遇到问题先查看 [README](README.md) 与 [QUICK_START](QUICK_START.md) 的故障排除部分，或在项目仓库提交 Issue。

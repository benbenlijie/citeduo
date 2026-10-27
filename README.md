# CiteDuo

**Search papers, map their citation networks, and find out how any two papers are actually connected.**

[![CI](https://github.com/benbenlijie/citeduo/actions/workflows/ci.yml/badge.svg)](https://github.com/benbenlijie/citeduo/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/Bun-1.3%2B-black?logo=bun)](https://bun.sh)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**[Live demo →](https://watchdeep.net/papers/)** · [中文说明](README.zh-CN.md) · [Architecture](ARCHITECTURE.md)

The public demo is open without a token. It has a daily visitor/request budget and returns a friendly `429` when the budget is exhausted, so a burst of traffic cannot run up API or LLM bills. Run CiteDuo locally for unlimited use.

![The citation network, live](docs/images/graph-demo.gif)

Self-hosted and local-first: one Bun process, one SQLite file, no account, no cloud.

---

## Why another paper explorer?

Most citation-graph tools show you the neighbourhood of **one** paper. That answers "what is around this paper?" — but not the question you have when two papers are already in front of you: **"how are these two related?"**

CiteDuo is built around that second question, and around owning your own data.

| | Typical citation-graph tool | CiteDuo |
| --- | --- | --- |
| Neighbourhood graph | ✅ | ✅ |
| "How are these two papers connected?" | ❌ | ✅ an explained path, hop by hop, with alternatives |
| Runs on your own machine | ❌ | ✅ single Bun process + SQLite file |
| Read + translate the paper in-app | ❌ | ✅ arXiv HTML reader with bilingual mode |
| Ask an AI that has actually read the paper | ❌ | ✅ retrieval over the full text before it answers |
| Notes, favourites, collections | limited | ✅ local, exportable |

## How two papers are related

Pick any two papers and the app searches for the chain that links them, then explains each hop in plain language.

![Two-paper relation analysis](docs/images/two-paper-connection.png)

- **An answer, not just a graph.** "Both are cited by *Uni-AdaFocus*, so they are usually discussed together" — that is the whole point.
- **Paths are ranked by evidence.** Direct reference (1.0) › citation (0.95) › bibliographic coupling (0.8) › related work (0.6) › embedding similarity (0.45). A one-hop answer only counts as a direct citation when the hop really is one: a single coupling edge is labelled coupling, and a symmetric `related`/`semantic` edge is a similarity bridge rather than a made-up citation. Longer routes are labelled by shape — coupling, co-citation, citation path or similarity bridge.
- **Alternatives are shown**, so you can tell a robust connection from a coincidental one.
- **Signals alongside the path**: shared references, shared citers, embedding similarity, shared fields, shared authors.
- **Four tiers, cheapest first**: fetch the two endpoints best-effort → walk relations already stored locally → a budgeted live crawl → an embedding bridge as a last resort. Ask for a local-only answer when you want it instantly and offline.

## Features

### Explore

![Citation network graph](docs/images/network-graph.png)

- **Search** across Semantic Scholar and OpenAlex, merged and de-duplicated by DOI/arXiv id, with locally remembered keyword history.
- **Interactive citation network** — PageRank-weighted nodes, Louvain community clustering, per-edge-type visibility toggles, and a timeline you can scrub or play back to see a field grow.
- **2D canvas or 3D** force graph, whichever suits the question.
- **Node context menu**: rebuild the graph from here, re-search by title, expand this node, add to comparison, open the original.
- **Multi-source relation edges**: citations and references, Semantic Scholar recommendations, OpenAlex related works (with an arXiv title fallback), bibliographic coupling, and SPECTER2 embedding kNN — normalised so the same paper never appears twice.
- **Graph caching** of nodes, edges *and* layout, so reopening a network is instant instead of re-running the simulation.

### Compare

Two papers side by side, each with its own citation graph, sharing the filters and encodings — or hand the pair straight to the relation analysis with one click.

![Side-by-side comparison](docs/images/compare.png)

### Read

- **In-app reading** of arXiv HTML with a section outline; papers without an HTML build fall back to abs/PDF.
- **Immersive bilingual translation** per paragraph, with any OpenAI-compatible provider, or entirely in-browser via the built-in Translator API.
- **AI reading assistant** driven by a local [`opencode`](https://opencode.ai) agent. It calls retrieval tools (`paper_search`, `paper_section`) before answering and streams what it is doing ("searching…", "reading section 3"), so answers come from the paper rather than the model's memory.
- **Reading queue and progress** — to-read / reading / done, plus scroll progress per paper.
- **Highlights and annotations** in four colours, stored locally.

![Reader with bilingual translation](docs/images/reader-translation.png)

![AI reading assistant](docs/images/ai-assistant.png)

### Keep and share

- **Notes, favourites, collections** and saved searches, all local.
- **Import/export**: PNG of the current view, JSON, BibTeX, CSV, or the full crawled network as JSON.
- **Shareable deep links.** The paper, filters, encoding, view mode and the compared pair all round-trip through the URL — including `?from=<id>&to=<id>`, which re-runs a relation analysis for whoever opens it.
- **Optional access token**, or a public-demo daily visitor/request budget if you want the GitHub demo open to everyone.

## Quick start

Nothing installed but Docker? One command, no account, no config file:

```bash
docker run -d --name citeduo -p 8787:8787 -v citeduo-data:/data ghcr.io/benbenlijie/citeduo:latest
# → http://127.0.0.1:8787
```

Or with compose, which sets `PAPER_CONTENT_MODE=full` for a single-user instance: `docker compose up --build`.

### From source

Requires **[Bun](https://bun.sh) ≥ 1.3** and **pnpm 9**.

```bash
git clone https://github.com/benbenlijie/citeduo.git
cd citeduo
bash scripts/setup.sh      # installs both dependency trees, creates data/, copies server/.env
bun run build:web          # build the frontend
bun run server             # http://127.0.0.1:8787
```

That is a fully working local instance. Searching works immediately; adding a free `SEMANTIC_SCHOLAR_API_KEY` to `server/.env` makes upstream calls much more comfortable.

Working on the frontend (`/api` is proxied to 8787, with hot reload):

```bash
bun run server        # terminal A
bun run dev:web       # terminal B
```

## Architecture

```mermaid
flowchart LR
  UI["Browser<br/>React 18 · Vite · Tailwind<br/>react-force-graph"] -->|"/api/*"| S["Bun server<br/>Bun.serve"]
  S --> DB[("SQLite<br/>data/app.db")]
  S -->|"search · refs · cites"| S2["Semantic Scholar"]
  S -->|"search · related works"| OA["OpenAlex"]
  S -->|"embeddings"| SP["SPECTER2"]
  S -.->|"chat · translation"| LLM["LLM provider<br/>(optional)"]
  S -.->|"agent tools"| OC["opencode serve<br/>(optional)"]
```

Everything is one process: the Bun server serves the built frontend, the JSON API, and the SQLite database. Upstream responses are persisted, so graphs, relation edges and paper text get faster the more you use it — and a local-only relation answer needs no network at all.

```
citeduo/
├── academic-paper-explorer/   # React frontend (src/, components/, graph/, store/)
├── server/                    # Bun backend: routes, upstream clients, SQLite, graph search
│   ├── pathfind.ts            # pure path search + ranking + explanation
│   └── connect.ts             # the four-tier relation search
├── scripts/                   # setup.sh, deploy.sh, opencode-local.ts
└── docs/images/               # screenshots used by this README
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the long version.

## Configuration

`server/.env` (copied from `server/.env.example` by `setup.sh`). Everything is optional — the defaults run offline against an empty database.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8787` | Listen port (loopback only). |
| `HOST` | `127.0.0.1` | Set to `0.0.0.0` only if you add your own TLS/reverse proxy. |
| `ACCESS_TOKEN` | – | If set, the whole app requires this token (`?token=…` sets a cookie). Leave unset for an open instance. |
| `ADMIN_TOKEN` | – | Optional separate password for the usage dashboard. Falls back to `ACCESS_TOKEN`. Required for a public demo. |
| `DEMO_PUBLIC` | `0` | `1` enables the public-demo guard: anonymous server AI/translation is refused and the daily budget is enforced. |
| `DEMO_DAILY_VISITOR_LIMIT` | `0` | Daily unique-visitor cap for the public demo; `0` = unlimited. |
| `DEMO_DAILY_REQUEST_LIMIT` | `0` | Daily HTML/API request cap for the public demo; `0` = unlimited. |
| `DEMO_BLOCK_ON_LIMIT` | `1` | `0` = alert only; the default returns `429` for the rest of the day. |
| `DEMO_ALERT_WEBHOOK` | – | Optional webhook for the one-time over-limit alert; otherwise the alert goes to the journal. |
| `ANALYTICS_ENABLED` | `1` | `0` disables first-party usage collection entirely. |
| `RATE_LIMIT_PER_MIN` | `120` | Per-IP requests/minute on `/api/*`. `0` disables. |
| `TRUST_PROXY` | off | Read the client IP from `X-Real-IP` / `X-Forwarded-For` — only behind a proxy you control. |
| `SEMANTIC_SCHOLAR_API_KEY` | – | Without it you share S2's anonymous rate limit. |
| `OPENALEX_API_KEY` | – | Avoids OpenAlex's anonymous limit. |
| `S2_MIN_INTERVAL_MS` | `1000` | Minimum spacing between S2 calls, with or without a key. |
| `OPENALEX_MIN_INTERVAL_MS` | – | Same, for OpenAlex. |
| `CONNECT_MAX_EXPANSIONS` | `6` | Live S2 batch fetches allowed per relation search. |
| `CONNECT_MAX_MS` | `25000` | Wall-clock budget for one relation search. |
| `CONNECT_LOCAL_ONLY` | off | `1` = answer only from stored relations, never fetch. |
| `PAPER_CONTENT_MODE` | `auto` | `full` / `off` / `auto`; `auto` means full text only on a loopback instance, and abstracts plus an arXiv link anywhere else. |
| `ARXIV_API_MIN_INTERVAL_MS` | `3000` | arXiv's API terms ask for at most one request every three seconds. |
| `ARXIV_CONTENT_MIN_INTERVAL_MS` | `1000` | Floor between arXiv paper-page fetches. Raise to `15000` for a literal reading of `robots.txt`. |
| `ARXIV_CONTENT_MAX_PER_HOUR` | `60` | Circuit breaker on paper-page fetches per hour. |
| `ABSTRACT_MEMO_MAX` | `500` | Cap on in-memory CC0 abstracts when `PAPER_CONTENT_MODE=off`; oldest entries are evicted first. `0` disables the memo. Non-numeric values fall back to 500. |

The complete list, including the crawl and translation knobs, is in [`server/.env.example`](server/.env.example).

**Usage analytics** — meaningful actions are appended to `usage_events` in the same SQLite file (`data/app.db`): page views, searches, graph builds, reader opens, translations and AI sessions. The dashboard is at `/stats` (`/papers/stats` when mounted under a sub-path) and is protected by `ACCESS_TOKEN`; set `ADMIN_TOKEN` to give it a separate password and open `/stats?token=…` once. Page views are reported by the SPA on route changes; API events are recorded server-side. The table stores an anonymous first-party cookie id, not raw IPs or user agents, and strips query strings from page paths and referrers so an access token can never end up in analytics.

**Public demo** — leave `ACCESS_TOKEN` unset, set `ADMIN_TOKEN` (the dashboard/admin APIs still need it), and set `DEMO_DAILY_VISITOR_LIMIT` / `DEMO_DAILY_REQUEST_LIMIT`. Request counting covers HTML navigations and API calls, not static assets. When either cap is crossed, the current day returns `429` until local midnight; `DEMO_BLOCK_ON_LIMIT=0` switches to alert-only. Set `DEMO_ALERT_WEBHOOK` plus `DEMO_ALERT_FORMAT=generic|slack|discord|feishu` for an external alert; otherwise the alert goes to the server journal. `GET /api/admin/demo-quota` shows the state and `POST /api/admin/demo-quota/reset` is the emergency reset. For a public instance also set `PAPER_CONTENT_MODE=off`. `DEMO_PUBLIC=1` already refuses anonymous `/api/translate` and `/api/ai/*`, so a server-side key is only usable by an admin; if you want no paid key in the public process at all, set `LLM_PROVIDERS=[{"name":"browser","kind":"browser"}]` and `OPENCODE_ENABLED=0`.

**Reader and arXiv usage** — the in-app reader can show a paper's full text, but arXiv's terms of use only allow storing and serving e-print content "for your own personal use, or for research purposes" ([tou.html](https://info.arxiv.org/help/api/tou.html)). `PAPER_CONTENT_MODE` therefore defaults to `auto`: `full` on a loopback-only instance, `off` anywhere else. With `off` the reader returns the abstract, the metadata and a link to the paper's arXiv page, and writes nothing to disk. A public demo should leave it at `off`; permissive licences could later be detected per paper and served individually.

**LLM / translation provider** — an ordered fallback list; `kind: "browser"` needs no key and runs entirely in the visitor's browser:

```env
LLM_PROVIDERS=[{"name":"local","kind":"openai","baseUrl":"https://<host>/v1","apiKey":"sk-...","model":"..."},{"name":"browser","kind":"browser"}]
```

**AI assistant** — needs the `opencode` binary on the host; the server starts `opencode serve` on demand and reuses the first `openai` provider above:

```env
OPENCODE_ENABLED=1            # 0 disables the assistant
OPENCODE_BIN=opencode         # absolute path if it is not on PATH
OPENCODE_PORT=4096
AI_MAX_STEPS=8                # tool steps per turn
PAPER_CONTENT_TTL_HOURS=168   # paper-text cache TTL
INTERNAL_TOKEN=               # shared secret for the internal retrieval API; random per boot if unset
```

Without an `openai` provider or with opencode unavailable, `/api/ai/*` returns `503` and translation is unaffected.

## API

| Route | What it does |
| --- | --- |
| `POST /api/search` | Search papers across sources. |
| `POST /api/details` | Paper details (authors, venue, citation counts, abstract). |
| `POST /api/network` | Fetch or build a citation network. |
| `POST /api/connect` | **Relate two papers**: `{from_id, to_id, live?, max_hops?}` → ranked paths, per-hop explanation, signals. |
| `GET /api/neighbors/:id` | Locally stored relations for a paper. |
| `POST /api/lineage` | Citation lineage. |
| `GET /api/reader/:arxivId` | arXiv HTML for the in-app reader. |
| `POST /api/translate` | Batch translation via the configured provider. |
| `POST /api/ai/session` · `POST /api/ai/chat` · `GET /api/ai/stream` · `GET /api/ai/history` · `POST /api/ai/abort` | AI assistant session, streaming answers and tool activity. |
| `GET /api/llm/status` | Which LLM/translation providers are available. |
| `GET /api/jobs/:id` | Background job status. |
| `POST /api/analytics/pageview` | SPA route-change beacon for first-party page-view counts. |
| `GET /api/admin/usage?range=7d\|30d\|90d\|all` | Aggregate usage JSON for the `/stats` dashboard. |
| `GET /api/admin/demo-quota` | Current public-demo daily budget state. |
| `POST /api/admin/demo-quota/reset` | Emergency reset of today's public-demo budget. |
| `GET /api/paper/session/:id/search?q=` · `GET /api/paper/session/:id/section/:idx` | Full-text retrieval used by the assistant's tools (`X-Internal-Token`). |

## Development

```bash
bun run test:server                        # backend
pnpm --dir academic-paper-explorer test    # frontend
bun run typecheck:server
pnpm --dir academic-paper-explorer typecheck
pnpm --dir academic-paper-explorer lint
```

CI runs exactly these on every push and pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) for the commit convention and the development workflow.

## Deployment

`bun run deploy` builds the frontend and rsyncs the tree to a host you configure in `scripts/deploy.sh`, then restarts the service and health-checks the URL. The bundled guide covers a sub-path deployment behind nginx with TLS, the token gate, and running it as a systemd unit — see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

> The [live demo](https://watchdeep.net/papers/) is open without a token but has a daily visitor/request budget; after the cap it returns `429` until local midnight. Anonymous visitors cannot use server-side AI/translation (browser translation still works). It exists to try the app, not to hold your data.

## Roadmap

- [ ] Export a relation path as a citable figure / BibTeX snippet.
- [ ] Zotero and BibTeX library import.
- [ ] Full-text search over locally cached paper text.
- [ ] Postgres backend for multi-user deployments.

Ideas and bug reports are welcome in [issues](https://github.com/benbenlijie/citeduo/issues).

## Related work

This is not the first tool in this space, and it does not try to replace the good ones. [Connected Papers](https://www.connectedpapers.com/), [Litmaps](https://www.litmaps.com/), [ResearchRabbit](https://www.researchrabbit.ai/) and [Inciteful](https://inciteful.xyz/) all do citation-neighbourhood exploration well. CiteDuo deliberately differs in three ways: it answers for a **pair** of papers with a ranked, explained path rather than only drawing a neighbourhood; it runs entirely on your own machine instead of as an account-based web service; and its assistant has to retrieve the paper text before it answers.

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Security issues: please follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## License

[MIT](LICENSE).

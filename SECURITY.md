# Security Policy

## Reporting a vulnerability

Please **do not** report security vulnerabilities in a public GitHub issue, and never
paste real secrets into an issue, a pull request, or a discussion.

Use GitHub's private vulnerability reporting instead:

1. Go to **Security → Advisories → Report a vulnerability** on
   <https://github.com/benbenlijie/citeduo/security/advisories/new>.
2. Describe the issue with enough detail to reproduce it.

This opens a private advisory visible only to the maintainers. If private reporting is
unavailable to you, open a minimal public issue asking a maintainer to contact you and
we will set up a private channel — do not include exploit details or secrets in it.

Helpful reports include:

- Affected version / commit (`git rev-parse --short HEAD`).
- The relevant configuration (with secrets redacted) — for example whether
  `ACCESS_TOKEN` is set and whether the instance is loopback-only or public.
- A reproduction, ideally a minimal request or script.
- Impact and any proof of concept.

This is a small, best-effort project pre-1.0. We will acknowledge reports as soon as we
can, keep you updated on the fix, and credit you in the advisory if you would like.

## Secrets

This application can hold live credentials:

- `ACCESS_TOKEN` — the access token for a publicly exposed instance
- `AI_ACCESS_TOKEN` — the separate token that unlocks `/api/ai/*`; when unset, AI falls back to `ACCESS_TOKEN`, and when both are unset AI is disabled. Browsers log in at `/ai-login` (POST body → `cp_ai` HttpOnly cookie); the token is never accepted from a query string.
- `OPENCODE_SERVER_PASSWORD` — HTTP Basic auth for the external `opencode serve` API
- `SEMANTIC_SCHOLAR_API_KEY` and `OPENALEX_API_KEY` — third-party API keys
- `LLM_PROVIDERS` — OpenAI-compatible API keys for translation / the AI assistant
- `INTERNAL_TOKEN` — the shared secret used by the AI agent's retrieval routes

They live in `server/.env` (created from `server/.env.example`), which is git-ignored.
If you ever paste a real key or token into an issue, a PR, a log, or a commit, treat it
as compromised and rotate it at the provider immediately. Then remove it from the
public history if it was committed.

To keep credentials out of the repository in the first place, run the built-in scanner:

```bash
bash scripts/secret-scan.sh                  # scan the whole git history
bash scripts/secret-scan.sh --install-hook   # also block leaks at commit time
```

The same scan runs in CI on every push and pull request
(`.github/workflows/secret-scan.yml`), and GitHub push protection rejects a push that
contains a recognised secret. Add an entry to `.gitleaks.toml` only when a finding is a
genuine false positive — an allowlist is a permanent exemption, so never suppress a real
key with it.

### Rotating a leaked key

A key that was ever visible is compromised, even if the commit was amended or the file
deleted afterwards: rewriting history does not un-send it to anyone who already fetched,
and copies may sit in forks, caches or CI logs. Rotate first, clean up second.

1. **Revoke at the provider, then issue a new key.** Rotating means invalidating the old
   one — issuing a second key alongside it leaves the leak live.
   - Semantic Scholar — <https://www.semanticscholar.org/product/api>
   - OpenAlex — <https://openalex.org/rest-api>
   - An OpenAI-compatible provider (the `apiKey` inside `LLM_PROVIDERS`) — that
     provider's dashboard
   - `ACCESS_TOKEN`, `AI_ACCESS_TOKEN`, `OPENCODE_SERVER_PASSWORD` and `INTERNAL_TOKEN` are registered nowhere: replacing the value in
     `server/.env` and restarting *is* the rotation. Changing `ACCESS_TOKEN` signs out
     every existing cookie; changing `AI_ACCESS_TOKEN` signs out every `cp_ai` cookie,
     which is the only way to invalidate one.
2. **Update `server/.env`** (git-ignored) and restart the server.
3. **Check whether it reached the repository**, not just the working tree:
   ```bash
   bash scripts/secret-scan.sh                              # full history
   git log -S '<first 8 characters of the key>' --oneline --all
   ```
   Then check what history does not cover: CI logs, issue and PR text, gists, pasted
   transcripts, screenshots.
4. **If it is in history**, the value is already public. Rewriting (`git filter-repo`,
   BFG) helps only for keys nobody fetched, so treat it as a delay tactic rather than a
   fix — and note that GitHub keeps unreachable objects reachable by SHA for a while, so
   ask GitHub Support to purge them if it matters.
5. **Say so in the release** when the key had any privilege: a read-only key on a shared
   quota is a different incident from one that can spend money.

Routine hygiene that costs nothing: keep development keys separate from deployment keys,
give a public demo its own keys so a leak there cannot touch your account limits, and
re-read `server/.env.example` after adding a provider to see what the new key can do.

## Scope

**In scope** — issues in this project's own code:

- Authentication / authorization bypass of the optional access-token gate
  (`server/auth.ts`, `ACCESS_TOKEN`), including token extraction, the constant-time
  comparison, and the `?token=` → cookie flow.
- Bypass of the separate AI token gate (`AI_ACCESS_TOKEN`, `cp_ai` cookie) or the
  `opencode` HTTP Basic auth (`OPENCODE_SERVER_PASSWORD`).
- SSRF or unsafe outbound fetches through the paper/reader paths — for example arXiv
  HTML/PDF retrieval, OpenAlex title fallback, or any route where a user-controlled
  value can influence the fetched URL or host.
- SQL injection or unsafe query construction in the `bun:sqlite` layer
  (`server/db.ts`, `server/routes/`, `server/*.ts`).
- Path traversal in static file serving or the SPA fallback (`server/main.ts`).
- Injection / stored XSS in the in-app arXiv reader's HTML sanitization, or in content
  rendered from third-party metadata.
- Bypass or disclosure of the internal retrieval token protecting
  `GET /api/paper/session/:id/search` and `GET /api/paper/session/:id/section/:idx`.
- Command injection or unsafe process/config handling in the `opencode` sidecar
  integration (`server/opencode.ts`, `server/opencode-config.ts`).

**Out of scope**:

- Rate limits, quotas, or availability of third-party APIs (Semantic Scholar, OpenAlex,
  arXiv, LLM providers). Report those upstream.
- Missing hardening of a **deliberately public demo instance** — for example TLS,
  reverse-proxy configuration, security headers, or running without `ACCESS_TOKEN`.
  Exposing the app is your responsibility; see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).
- Denial of service through expensive graph crawls or translations on an instance you
  control.
- The accuracy, licensing, or content of third-party paper metadata.
- Vulnerabilities in dependencies: report them to the upstream project, though we are
  happy to hear about them if a dependency makes this project exploitable.
- Social engineering, physical access, or compromised developer machines.

## Supported versions

The project is pre-1.0 and maintained on a best-effort basis. Security fixes land on
`main`; there are no maintained release branches yet. When reporting, please test
against the latest `main`.

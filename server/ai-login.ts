import { aiCookieHeader, safeEqual, withBasePath } from './auth'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * Login form for the AI assistant.
 *
 * The token is submitted as a POST body, never as a query parameter: query
 * strings are written to nginx access logs, browser history and shell history,
 * and a login link is the easiest way for a secret to leak. There is no
 * JavaScript here; the form works with plain HTML and a cookie.
 */
export function aiLoginPage(basePath: string, error?: string, status = 200): Response {
  const action = escapeHtml(withBasePath(basePath, '/api/ai/login'))
  const home = escapeHtml(withBasePath(basePath, '/'))
  const message = error
    ? `<p class="error" role="alert">${escapeHtml(error)}</p>`
    : ''
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>AI 助手登录</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center;
    padding: 24px; background: #0f172a; color: #e5e7eb;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  main {
    width: 100%; max-width: 380px; padding: 28px;
    background: #1e293b; border: 1px solid #334155; border-radius: 14px;
    box-shadow: 0 20px 50px rgb(0 0 0 / 35%);
  }
  h1 { margin: 0 0 8px; font-size: 20px; letter-spacing: .01em; }
  p { margin: 0; color: #94a3b8; font-size: 14px; line-height: 1.65; }
  form { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
  label { color: #cbd5e1; font-size: 13px; }
  input {
    width: 100%; padding: 11px 12px; border-radius: 8px;
    border: 1px solid #475569; background: #0f172a; color: #f8fafc;
    font-size: 15px; outline: none;
  }
  input:focus { border-color: #818cf8; box-shadow: 0 0 0 3px rgb(99 102 241 / 20%); }
  button {
    padding: 11px 12px; border: 0; border-radius: 8px;
    background: #6366f1; color: #fff; font-size: 15px; font-weight: 600;
    cursor: pointer;
  }
  button:hover { background: #818cf8; }
  .error {
    margin-top: 14px; padding: 10px 12px; border-radius: 8px;
    background: rgb(127 29 29 / 35%); border: 1px solid rgb(248 113 113 / 45%);
    color: #fca5a5; font-size: 13px;
  }
  .hint { margin-top: 16px; font-size: 12px; color: #64748b; }
  a { display: inline-block; margin-top: 18px; color: #a5b4fc; font-size: 13px; }
</style>
</head>
<body>
<main>
  <h1>AI 助手登录</h1>
  <p>输入访问口令。口令只通过 HTTPS 提交，不会出现在网址里。</p>
  <form method="post" action="${action}">
    <label for="token">访问口令</label>
    <input id="token" name="token" type="password" required autofocus
           autocomplete="off" autocapitalize="off" spellcheck="false">
    <button type="submit">登录</button>
  </form>
  ${message}
  <p class="hint">口令由站点管理员提供，登录后 30 天内有效。</p>
  <a href="${home}">返回阅读页</a>
</main>
</body>
</html>`
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-Robots-Tag': 'noindex, nofollow',
      'Content-Security-Policy':
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    },
  })
}

function jsonError(message: string, status: number): Response {
  const code = status === 401 ? 'UNAUTHORIZED' : 'VALIDATION_FAILED'
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

/**
 * POST /api/ai/login. Accepts the browser form (`application/x-www-form-urlencoded`)
 * or a JSON `{ "token": "…" }` body. Returns a 303 redirect for browsers and a
 * JSON body for API clients; both set the HttpOnly AI cookie on success.
 */
export async function aiLoginRoute(
  req: Request,
  expected: string,
  basePath: string,
  secure: boolean,
): Promise<Response> {
  const type = (req.headers.get('content-type') ?? '').toLowerCase()
  const wantsJson =
    type.includes('application/json') || (req.headers.get('accept') ?? '').includes('application/json')
  const declared = Number(req.headers.get('content-length') ?? '0')
  if (Number.isFinite(declared) && declared > 4096) {
    return wantsJson ? jsonError('请求体过大', 413) : aiLoginPage(basePath, '请求体过大。', 413)
  }

  let submitted = ''
  if (type.includes('application/x-www-form-urlencoded')) {
    const body = await req.text()
    if (body.length > 4096) return aiLoginPage(basePath, '请求体过大。', 413)
    submitted = new URLSearchParams(body).get('token') ?? ''
  } else if (type.includes('application/json')) {
    const body = await req.text()
    if (body.length > 4096) return jsonError('请求体过大', 413)
    try {
      const parsed = JSON.parse(body) as { token?: unknown } | null
      if (typeof parsed?.token === 'string') submitted = parsed.token
    } catch {
      // fall through to the generic invalid-token response
    }
  } else {
    return new Response('Unsupported Media Type', {
      status: 415,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  }

  const value = submitted.trim()
  if (!value || value.length > 512 || !safeEqual(value, expected)) {
    return wantsJson ? jsonError('口令不正确', 401) : aiLoginPage(basePath, '口令不正确，请重试。', 401)
  }

  if (wantsJson) {
    return new Response(JSON.stringify({ data: { ok: true } }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Set-Cookie': aiCookieHeader(expected, secure),
      },
    })
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: withBasePath(basePath, '/'),
      'Set-Cookie': aiCookieHeader(expected, secure),
      'Cache-Control': 'no-store',
    },
  })
}

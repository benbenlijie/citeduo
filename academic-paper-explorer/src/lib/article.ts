const ARXIV_BASE = 'https://arxiv.org'
const ARXIV_HTML_DIR = `${ARXIV_BASE}/html/`
const AR5IV_BASE = 'https://ar5iv.labs.arxiv.org'

/** arXiv builds HTML per version, so `/html/2401.00001v2` 404s whenever only
 *  another version was converted. Every reader URL is version-less. */
export function stripVersion(id: string): string {
  return id.replace(/v\d+$/, '')
}

export function arxivHtmlUrl(id: string): string {
  return `${ARXIV_BASE}/html/${encodeURIComponent(stripVersion(id))}`
}

/** ar5iv converts papers arXiv itself skipped. It sends no CORS header, so the
 *  browser cannot fetch it — only the server proxy can. */
export function ar5ivHtmlUrl(id: string): string {
  return `${AR5IV_BASE}/html/${encodeURIComponent(stripVersion(id))}`
}

export function arxivAbsUrl(id: string): string {
  return `${ARXIV_BASE}/abs/${encodeURIComponent(id)}`
}

export function arxivPdfUrl(id: string): string {
  return `${ARXIV_BASE}/pdf/${encodeURIComponent(id)}`
}

export interface OutlineItem {
  id: string
  text: string
  level: number
}

const STRIP_TAGS = ['script', 'iframe', 'object', 'embed', 'noscript']

/** Resolve a URL against the arXiv HTML directory, or return null when it must
 *  be left alone (fragment-only links, absolute URLs, other schemes). */
function absolutize(value: string, base = ARXIV_HTML_DIR): string | null {
  const raw = value.trim()
  // `#S1` is an in-document anchor; `mailto:`, `data:` etc. are already absolute.
  if (!raw || raw.startsWith('#') || raw.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(raw)) return null
  try {
    return new URL(raw, base).toString()
  } catch {
    return null
  }
}

/** arXiv's figures and stylesheets use paths relative to `/html/`
 *  (`2401.00001v1/Figures/fig.png`, `/static/browse/...`). Rewrite them to
 *  absolute URLs instead of relying on a `<base>` element: the reader renders
 *  the paper as an iframe `srcdoc`, which inherits the page CSP, and the
 *  deployment proxy sends `base-uri 'self'` — a cross-origin `<base>` is then
 *  ignored and every figure resolves against our own origin and 404s. */
function absolutizeUrls(doc: Document): void {
  const URL_ATTRS = new Set(['src', 'href', 'xlink:href', 'poster'])
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase()
      if (name === 'srcset') {
        const rewritten = attr.value
          .split(',')
          .map((part) => {
            const [url, ...descriptor] = part.trim().split(/\s+/)
            const abs = url ? absolutize(url) : null
            return abs ? [abs, ...descriptor].join(' ') : part.trim()
          })
          .join(', ')
        if (rewritten !== attr.value) attr.value = rewritten
      } else if (URL_ATTRS.has(name)) {
        const abs = absolutize(attr.value)
        if (abs) attr.value = abs
      }
    }
  })
}

/**
 * Defensive sanitize for third-party (arXiv) HTML before it is rendered in a
 * sandboxed same-origin iframe: drop active content and pointing handlers, and
 * rewrite relative asset paths to absolute arXiv URLs so figures (and the
 * stylesheet) load no matter what the embedding page's CSP says about `<base>`.
 */
export function sanitizeArticleHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  // LaTeXML renders SVG figures as <object type="image/svg+xml" data=...>; turn
  // those into <img> so they survive the sanitizer, then drop any other object.
  doc.querySelectorAll('object[type="image/svg+xml"][data]').forEach((obj) => {
    const img = doc.createElement('img')
    img.setAttribute('src', obj.getAttribute('data') ?? '')
    for (const attr of ['alt', 'width', 'height', 'style', 'class', 'id']) {
      const value = obj.getAttribute(attr)
      if (value) img.setAttribute(attr, value)
    }
    obj.replaceWith(img)
  })

  for (const tag of STRIP_TAGS) {
    doc.querySelectorAll(tag).forEach((el) => el.remove())
  }

  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase()
      const value = attr.value.trim().toLowerCase()
      if (name.startsWith('on')) el.removeAttribute(attr.name)
      else if ((name === 'href' || name === 'src' || name === 'xlink:href') && value.startsWith('javascript:')) {
        el.removeAttribute(attr.name)
      }
    }
  })

  // A <base> would be silently ignored under `base-uri 'self'`; make every URL
  // absolute instead.
  const head = doc.querySelector('head') ?? doc.documentElement
  head.querySelectorAll('base').forEach((el) => el.remove())
  absolutizeUrls(doc)

  return `<!DOCTYPE html>${doc.documentElement.outerHTML}`
}

export function extractOutline(html: string): OutlineItem[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const out: OutlineItem[] = []
  const seen = new Set<string>()
  const push = (id: string | null, text: string, level: number) => {
    if (!id || !text || seen.has(id)) return
    seen.add(id)
    out.push({ id, text, level })
  }

  // Covers both plain heading ids and LaTeXML, where the id lives on the
  // enclosing <section> and the heading itself has no id.
  doc.querySelectorAll('h1[id], h2[id], h3[id], h4[id], section[id]').forEach((el) => {
    if (el.tagName === 'SECTION') {
      const heading = el.querySelector('h1, h2, h3, h4')
      if (heading) push(el.getAttribute('id'), (heading.textContent ?? '').trim(), Number(heading.tagName.slice(1)))
    } else {
      push(el.getAttribute('id'), (el.textContent ?? '').trim(), Number(el.tagName.slice(1)))
    }
  })
  return out
}

/** Where the reader's text came from. Mirrors the server's `PaperSource`. */
export type PaperSource = 'html' | 'ar5iv' | 'pdf' | 'abstract'

export interface ReaderSection {
  idx: number
  heading: string
  text: string
}

export interface ReaderContent {
  arxivId: string
  title: string
  sections: ReaderSection[]
  source: PaperSource
  /** The server withheld the full text on purpose (arXiv content policy), rather
   *  than failing to find it. */
  fullTextWithheld?: boolean
  /** Canonical arXiv abstract page, for linking out when text is withheld. */
  arxivUrl?: string
}

export function isPaperSource(v: unknown): v is PaperSource {
  return v === 'html' || v === 'ar5iv' || v === 'pdf' || v === 'abstract'
}

/** Human-readable note for a fallback source, or null for arXiv's own HTML. */
export function sourceNotice(source: PaperSource | null): string | null {
  switch (source) {
    case 'ar5iv':
      return 'arXiv 未提供该论文的 HTML 版，当前显示 ar5iv 转换版，排版可能与原文略有差异。'
    case 'pdf':
      return '该论文没有可用的 HTML 版，当前文本由 PDF 自动抽取，公式、图表和版式可能缺失。'
    case 'abstract':
      return '该论文的全文无法获取，当前仅显示摘要。'
    default:
      return null
  }
}

/** Notice for an instance that withholds third-party full text by policy — a
 *  deliberate choice, not a failed fetch, so it says why and where to go. */
export function withheldNotice(): string {
  return '这个实例对他人开放，按 arXiv 的使用条款不缓存也不对外提供论文全文，因此这里只显示摘要与元数据。阅读原文请点右上角的 arXiv 链接。'
}

export type ReaderErrorKind = 'no-html' | 'timeout' | 'network'

/** Message shown when every source failed, split by cause so "no HTML build"
 *  is not confused with a blocked/slow network. */
export function readerErrorMessage(kind: ReaderErrorKind): string {
  switch (kind) {
    case 'timeout':
      return '网络请求超时，arXiv 或服务器响应过慢。'
    case 'network':
      return '网络受限，无法访问 arXiv 或本地服务。'
    default:
      return '该论文没有可用的 HTML 版，服务端也未能抽取到全文。'
  }
}

/** Classify a failed reader load from the two attempts (arXiv HTML, then the
 *  server). A timeout means "slow or blocked"; a TypeError means the request
 *  never reached anyone (offline / DNS / CORS); anything else means both
 *  responded and simply had no usable text. */
export function classifyReaderError(htmlError: unknown, serverError: unknown): ReaderErrorKind {
  if (isTimeoutError(htmlError) || isTimeoutError(serverError)) return 'timeout'
  if (htmlError instanceof TypeError || serverError instanceof TypeError) return 'network'
  return 'no-html'
}

export function isTimeoutError(e: unknown): boolean {
  const name = (e as { name?: string })?.name
  return name === 'TimeoutError' || name === 'AbortError'
}

export const HTML_TIMEOUT_MS = 20_000
export const SERVER_TIMEOUT_MS = 90_000

export class HttpError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`)
    this.name = 'HttpError'
  }
}

/** `fetch` with a deadline; the caller's signal still cancels it. */
export async function fetchWithTimeout(url: string, ms: number, signal?: AbortSignal): Promise<Response> {
  const ctrl = new AbortController()
  const abort = () => ctrl.abort()
  if (signal) {
    if (signal.aborted) ctrl.abort()
    else signal.addEventListener('abort', abort, { once: true })
  }
  const timer = setTimeout(() => ctrl.abort(timeoutError()), ms)
  try {
    return await fetch(url, { signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
  }
}

function timeoutError(): Error {
  const e = new Error('timeout')
  e.name = 'TimeoutError'
  return e
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/**
 * Build the reader document for content that came from the server (ar5iv, PDF
 * text or an abstract). Rendering it as plain `<section>/<h2>/<p>` means the
 * existing in-iframe machinery — outline, translation, highlights, AI
 * selection — works unchanged on papers that have no arXiv HTML.
 */
export function synthesizeArticleHtml(content: ReaderContent, maxCharsPerParagraph = 900): string {
  const title = escapeHtml(content.title || content.arxivId)
  const body = content.sections
    .map((section, i) => {
      const id = `S${i}`
      const heading = section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : ''
      const paragraphs = splitParagraphs(section.text, maxCharsPerParagraph)
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join('\n')
      return `<section id="${id}">${heading}\n${paragraphs}</section>`
    })
    .join('\n')

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: Georgia, "Times New Roman", serif; max-width: 46rem; margin: 0 auto;
         padding: 2rem 1.5rem 4rem; color: #111827; line-height: 1.75; }
  h1 { font-size: 1.6rem; line-height: 1.35; margin: 0 0 1.5rem; }
  h2 { font-size: 1.2rem; margin: 2rem 0 0.75rem; }
  p { margin: 0 0 1rem; }
</style></head>
<body class="ltx_document">
<h1 class="ltx_title ltx_title_document">${title}</h1>
${body}
</body></html>`
}

/** Split long PDF-extracted text into translatable paragraphs. PDF text has no
 *  paragraph breaks, so cut at sentence ends instead of sending a 3k-char block
 *  to the translator as one unit. */
export function splitParagraphs(text: string, maxChars = 900): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  const out: string[] = []
  let current = ''
  for (const sentence of splitSentences(trimmed)) {
    if (current && current.length + 1 + sentence.length > maxChars) {
      out.push(current)
      current = sentence
    } else {
      current = current ? `${current} ${sentence}` : sentence
    }
  }
  if (current) out.push(current)
  return out
}

function splitSentences(text: string): string[] {
  const out: string[] = []
  let start = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (!'.!?。！？'.includes(ch)) continue
    const next = text[i + 1]
    if (next !== undefined && next !== ' ') continue
    out.push(text.slice(start, i + 1).trim())
    start = i + 2
    i += 1
  }
  if (start < text.length) out.push(text.slice(start).trim())
  return out.filter(Boolean)
}

import { describe, it, expect } from 'vitest'
import {
  ar5ivHtmlUrl,
  arxivAbsUrl,
  arxivHtmlUrl,
  arxivPdfUrl,
  classifyReaderError,
  extractOutline,
  HttpError,
  readerErrorMessage,
  sanitizeArticleHtml,
  sourceNotice,
  splitParagraphs,
  stripVersion,
  synthesizeArticleHtml,
  type ReaderContent,
} from './article'

describe('arxiv url builders', () => {
  it('builds html/abs/pdf urls', () => {
    expect(arxivHtmlUrl('2401.00001')).toBe('https://arxiv.org/html/2401.00001')
    expect(arxivAbsUrl('2401.00001')).toBe('https://arxiv.org/abs/2401.00001')
    expect(arxivPdfUrl('2401.00001')).toBe('https://arxiv.org/pdf/2401.00001')
  })
})

describe('sanitizeArticleHtml', () => {
  const html = `<!DOCTYPE html><html><head>
    <link rel="stylesheet" href="/static/arxiv.css">
    <script>alert('x')</script>
  </head><body>
    <p onclick="steal()">hello</p>
    <a href="javascript:alert(1)">bad</a>
    <iframe src="https://evil.example"></iframe>
    <p>world</p>
  </body></html>`

  it('absolutizes relative figures against the arxiv html directory', () => {
    const withFigures = `<html><body>
      <img src="2401.00001v1/Figures/fig.png">
      <img src="https://cdn.example/x.png">
      <img src="#inline">
      <a href="#S1">section</a>
    </body></html>`
    const out = sanitizeArticleHtml(withFigures)
    expect(out).toContain('src="https://arxiv.org/html/2401.00001v1/Figures/fig.png"')
    expect(out).toContain('src="https://cdn.example/x.png"')
    expect(out).toContain('src="#inline"')
    expect(out).toContain('href="#S1"')
  })

  it('never injects a <base>: the deployment CSP (base-uri self) ignores it', () => {
    const out = sanitizeArticleHtml(html)
    expect(out).not.toContain('<base')
    expect(out).toContain('href="https://arxiv.org/static/arxiv.css"')
  })

  it('converts SVG <object> figures into <img> and drops other objects', () => {
    const withObjects = `<html><body>
      <object type="image/svg+xml" data="2601.21998v2/a.svg" width="10" height="5"></object>
      <object type="text/html" data="evil.html"></object>
    </body></html>`
    const out = sanitizeArticleHtml(withObjects)
    expect(out).toContain('<img')
    expect(out).toContain('2601.21998v2/a.svg')
    expect(out).not.toContain('<object')
  })

  it('strips scripts, iframes and event handlers', () => {
    const out = sanitizeArticleHtml(html)
    expect(out).not.toContain('<script')
    expect(out).not.toContain('alert(')
    expect(out).not.toContain('onclick')
    expect(out).not.toContain('<iframe')
    expect(out).not.toContain('javascript:')
  })

  it('keeps the stylesheet and body text', () => {
    const out = sanitizeArticleHtml(html)
    expect(out).toContain('https://arxiv.org/static/arxiv.css')
    expect(out).toContain('hello')
    expect(out).toContain('world')
  })
})

describe('extractOutline', () => {
  it('reads heading levels, ids and text', () => {
    const html = `<html><body>
      <h1 id="S1">Introduction</h1>
      <h2 id="S2"> Methods </h2>
      <h3>No id</h3>
    </body></html>`
    expect(extractOutline(html)).toEqual([
      { id: 'S1', text: 'Introduction', level: 1 },
      { id: 'S2', text: 'Methods', level: 2 },
    ])
  })

  it('returns an empty list when there are no headings', () => {
    expect(extractOutline('<html><body><p>x</p></body></html>')).toEqual([])
  })

  it('reads the LaTeXML shape where the id is on the section', () => {
    const html = `<html><body>
      <section id="S1" class="ltx_section"><h2 class="ltx_title ltx_title_section">Introduction</h2></section>
      <section id="S2.SS1" class="ltx_subsection"><h3 class="ltx_title">Details</h3></section>
    </body></html>`
    expect(extractOutline(html)).toEqual([
      { id: 'S1', text: 'Introduction', level: 2 },
      { id: 'S2.SS1', text: 'Details', level: 3 },
    ])
  })
})

describe('reader source fallbacks', () => {
  it('strips the version so a version-less HTML build is not missed', () => {
    expect(arxivHtmlUrl('2401.00001v2')).toBe('https://arxiv.org/html/2401.00001')
    expect(ar5ivHtmlUrl('2401.00001v2')).toBe('https://ar5iv.labs.arxiv.org/html/2401.00001')
    expect(stripVersion('2401.00001v10')).toBe('2401.00001')
    expect(stripVersion('2401.00001')).toBe('2401.00001')
  })

  it('describes each fallback source', () => {
    expect(sourceNotice('html')).toBeNull()
    expect(sourceNotice(null)).toBeNull()
    expect(sourceNotice('ar5iv')).toMatch(/ar5iv/)
    expect(sourceNotice('pdf')).toMatch(/PDF/)
    expect(sourceNotice('abstract')).toMatch(/摘要/)
  })

  it('classifies load failures by cause', () => {
    const timeout = Object.assign(new Error('t'), { name: 'TimeoutError' })
    const http = new HttpError(404)
    expect(classifyReaderError(http, new HttpError(500))).toBe('no-html')
    expect(classifyReaderError(timeout, http)).toBe('timeout')
    expect(classifyReaderError(new TypeError('Failed to fetch'), http)).toBe('network')
    expect(classifyReaderError(http, new TypeError('Failed to fetch'))).toBe('network')
    expect(readerErrorMessage('timeout')).toMatch(/超时/)
    expect(readerErrorMessage('network')).toMatch(/网络/)
    expect(readerErrorMessage('no-html')).toMatch(/HTML/)
  })
})

describe('synthesizeArticleHtml', () => {
  const content: ReaderContent = {
    arxivId: '2401.00001',
    title: 'A <Paper> & Title',
    source: 'pdf',
    sections: [
      { idx: 0, heading: 'Introduction', text: 'First sentence. Second sentence.' },
      { idx: 1, heading: '', text: 'No heading here.' },
    ],
  }

  it('renders sections the reader machinery can use', () => {
    const html = synthesizeArticleHtml(content)
    expect(html).toContain('<section id="S0">')
    expect(html).toContain('<h2>Introduction</h2>')
    expect(html).toContain('<p>First sentence. Second sentence.</p>')
    expect(html).toContain('<section id="S1">')
    // Title text is escaped, never injected as markup.
    expect(html).toContain('A &lt;Paper&gt; &amp; Title')
    expect(html).not.toContain('<Paper>')
  })

  it('produces an outline when sanitized', () => {
    const outline = extractOutline(sanitizeArticleHtml(synthesizeArticleHtml(content)))
    expect(outline).toEqual([{ id: 'S0', text: 'Introduction', level: 2 }])
  })

  it('splits long PDF text into translatable paragraphs', () => {
    const long = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} about graphs.`).join(' ')
    const html = synthesizeArticleHtml(
      { arxivId: 'x', title: 'T', source: 'pdf', sections: [{ idx: 0, heading: '', text: long }] },
      200,
    )
    const paragraphs = html.match(/<p>/g) ?? []
    expect(paragraphs.length).toBeGreaterThan(1)
    for (const p of html.split('<p>').slice(1)) {
      expect(p.indexOf('</p>')).toBeGreaterThan(0)
      expect(p.slice(0, p.indexOf('</p>')).length).toBeLessThanOrEqual(200)
    }
  })
})

describe('splitParagraphs', () => {
  it('keeps short text in one paragraph and drops blank input', () => {
    expect(splitParagraphs('One sentence.')).toEqual(['One sentence.'])
    expect(splitParagraphs('   ')).toEqual([])
  })

  it('cuts at sentence boundaries', () => {
    expect(splitParagraphs('Alpha beta. Gamma delta. Epsilon.', 20)).toEqual([
      'Alpha beta.',
      'Gamma delta.',
      'Epsilon.',
    ])
  })
})

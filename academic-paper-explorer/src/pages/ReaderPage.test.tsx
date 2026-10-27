import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ReaderPage from './ReaderPage'
import { useReadingStore } from '../store/useReadingStore'
import { useHighlightsStore } from '../store/useHighlightsStore'
import { clearProviderCache } from '../lib/translator'

const ARTICLE = `<!DOCTYPE html><html><head><title>Paper</title></head><body>
  <h1 id="S1">Introduction</h1>
  <p>hello world</p>
</body></html>`

const realFetch = globalThis.fetch

function renderReader(path = '/read/2401.00001') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/read/:arxivId" element={<ReaderPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

let mockProviders: { name: string; kind: string }[] = []

beforeEach(() => {
  localStorage.clear()
  clearProviderCache()
  useReadingStore.setState({ entries: {} })
  useHighlightsStore.setState({ highlights: {} })
  mockProviders = []
  globalThis.fetch = vi.fn(async (url: unknown) => {
    if (String(url).includes('/api/llm/status')) {
      return { ok: true, json: async () => ({ data: { providers: mockProviders } }) } as unknown as Response
    }
    return { ok: true, text: async () => ARTICLE } as unknown as Response
  }) as unknown as typeof fetch
})

afterEach(() => {
  globalThis.fetch = realFetch
})

describe('ReaderPage', () => {
  /** Mount the reader and give its iframe a real, already-translated document. */
  async function setupTranslatedPaper() {
    renderReader()
    const frame = (await screen.findByTestId('reader-frame')) as HTMLIFrameElement
    const doc = frame.contentDocument!
    // jsdom does not load `srcdoc`, so give the iframe a real body first.
    doc.documentElement.innerHTML = '<head><title>Paper</title></head><body><p>hello world</p></body>'
    // Bind the reader's in-iframe listeners (idempotent: a real load may have
    // done it already).
    frame.dispatchEvent(new Event('load'))

    const block = doc.querySelector('p')!
    block.setAttribute('data-cn-src', '0')
    const node = doc.createElement('div')
    node.setAttribute('data-cn-translation', '')
    node.setAttribute('data-cn-for', '0')
    node.className = 'cn-translation'
    node.textContent = '你好，世界'
    block.insertAdjacentElement('afterend', node)
    return { doc, node }
  }

  function selectRange(doc: Document, node: Node, start: number, end: number) {
    const range = doc.createRange()
    range.setStart(node, start)
    range.setEnd(node, end)
    const sel = doc.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
    return sel
  }

  it('fetches, sanitizes and renders the article with its outline', async () => {
    renderReader()
    const frame = await screen.findByTestId('reader-frame')
    expect(frame.getAttribute('srcdoc')).toContain('hello world')
    // No <base>: the deployment CSP (`base-uri 'self'`) would ignore it, so the
    // sanitizer absolutizes URLs instead.
    expect(frame.getAttribute('srcdoc')).not.toContain('<base')
    expect(screen.getByRole('button', { name: 'Introduction' })).toBeInTheDocument()
  })

  it('shows a fallback with abs/pdf links when the fetch fails', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 404 }) as unknown as Response) as unknown as typeof fetch
    renderReader()
    expect(await screen.findByText(/无法加载/)).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links.some((l) => l.getAttribute('href') === 'https://arxiv.org/abs/2401.00001')).toBe(true)
  })

  it('links to the PDF as a fallback', async () => {
    renderReader()
    await screen.findByTestId('reader-frame')
    const links = screen.getAllByRole('link')
    expect(links.some((l) => l.getAttribute('href') === 'https://arxiv.org/pdf/2401.00001')).toBe(true)
  })

  it('disables translation when no provider is configured', async () => {
    renderReader()
    await screen.findByTestId('reader-frame')
    await waitFor(() => expect(screen.getByRole('button', { name: '翻译' })).toBeDisabled())
  })

  it('enables translation when a provider is configured', async () => {
    mockProviders = [{ name: 'browser', kind: 'browser' }]
    renderReader()
    await waitFor(() => expect(screen.getByRole('button', { name: '翻译' })).toBeEnabled())
  })

  it('disables the AI assistant when no openai provider is configured', async () => {
    mockProviders = [{ name: 'browser', kind: 'browser' }]
    renderReader()
    await waitFor(() => expect(screen.getByRole('button', { name: /AI 助手/ })).toBeDisabled())
  })

  it('enables the AI assistant with an openai provider', async () => {
    mockProviders = [{ name: 'mtcode', kind: 'openai' }]
    renderReader()
    await waitFor(() => expect(screen.getByRole('button', { name: /AI 助手/ })).toBeEnabled())
  })

  it('marks the paper as reading when opened', async () => {
    renderReader('/read/2401.00001?pid=p1')
    await screen.findByTestId('reader-frame')
    await waitFor(() => expect(useReadingStore.getState().entries.p1?.status).toBe('reading'))
  })

  it('highlights translated text as well as the English source', async () => {
    const { doc, node } = await setupTranslatedPaper()

    selectRange(doc, node.firstChild!, 0, 2)
    await act(async () => {
      doc.dispatchEvent(new Event('mouseup'))
    })

    expect(await screen.findByText('译文')).toBeInTheDocument()
    // The click that trails a text drag must not fold the translation out from
    // under the pending annotation.
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(node.textContent).toBe('你好，世界')

    fireEvent.click(screen.getByLabelText('高亮-绿'))
    expect(node.querySelector('mark[data-hl-id]')?.textContent).toBe('你好')
    expect(useHighlightsStore.getState().highlights['2401.00001']?.[0]).toMatchObject({
      blockIndex: 0,
      start: 0,
      end: 2,
      surface: 'translation',
      color: 'green',
    })
  })

  it('keeps a finished translation selectable instead of folding it on click', async () => {
    const { doc, node } = await setupTranslatedPaper()

    // A plain click on the text of a finished translation only places a caret.
    await act(async () => {
      node.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(node.textContent).toBe('你好，世界')
    expect(node.classList.contains('cn-translation--collapsed')).toBe(false)

    // Double-clicking a word (a collapsed selection on the first click, the word
    // itself on the second) must leave the text alone so the word stays picked.
    await act(async () => {
      doc.getSelection()!.removeAllRanges()
      node.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    })
    selectRange(doc, node.firstChild!, 0, 2)
    await act(async () => {
      node.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }))
    })
    expect(node.textContent).toBe('你好，世界')
    expect(node.classList.contains('cn-translation--collapsed')).toBe(false)
    expect(doc.getSelection()!.toString()).toBe('你好')
  })

  it('folds a finished translation on Alt+click and unfolds it on a plain click', async () => {
    const { node } = await setupTranslatedPaper()

    await act(async () => {
      node.dispatchEvent(new MouseEvent('click', { bubbles: true, altKey: true }))
    })
    expect(node.classList.contains('cn-translation--collapsed')).toBe(true)

    await act(async () => {
      node.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(node.classList.contains('cn-translation--collapsed')).toBe(false)
    expect(node.textContent).toBe('你好，世界')
  })

  /** Route every request the reader makes: arXiv HTML, the server fallback and
   *  the provider status poll. */
  function mockSources(opts: {
    html?: () => unknown
    server?: () => unknown
    onRequest?: (url: string) => void
  }) {
    globalThis.fetch = vi.fn(async (url: unknown) => {
      const u = String(url)
      opts.onRequest?.(u)
      if (u.includes('/api/llm/status')) return { ok: true, json: async () => ({ data: { providers: [] } }) }
      if (u.includes('/api/reader/')) {
        return opts.server ? opts.server() : { ok: false, status: 404 }
      }
      if (u.includes('arxiv.org/html/')) {
        return opts.html ? opts.html() : { ok: false, status: 404 }
      }
      throw new TypeError(`unexpected request ${u}`)
    }) as unknown as typeof fetch
  }

  const serverContent = {
    ok: true,
    json: async () => ({
      data: {
        arxivId: '2401.00001',
        title: 'Server Paper',
        source: 'pdf',
        sections: [{ idx: 0, heading: 'Introduction', text: 'Text pulled from the PDF.' }],
      },
    }),
  }

  it('falls back to the server text when arXiv has no HTML build', async () => {
    mockSources({ server: () => serverContent })
    renderReader()

    const frame = await screen.findByTestId('reader-frame')
    expect(frame.getAttribute('srcdoc')).toContain('Text pulled from the PDF.')
    expect(screen.getByRole('button', { name: 'Introduction' })).toBeInTheDocument()
    expect(screen.getByText(/PDF 自动抽取/)).toBeInTheDocument()
  })

  it('explains a policy-withheld paper instead of blaming the fetch', async () => {
    mockSources({
      server: () => ({
        ok: true,
        json: async () => ({
          data: {
            arxivId: '2401.00001',
            title: 'Withheld Paper',
            source: 'abstract',
            fullTextWithheld: true,
            arxivUrl: 'https://arxiv.org/abs/2401.00001',
            sections: [{ idx: 0, heading: 'Abstract', text: 'Abstract only.' }],
          },
        }),
      }),
    })
    renderReader()

    await screen.findByTestId('reader-frame')
    expect(screen.getByText(/按 arXiv 的使用条款不缓存也不对外提供论文全文/)).toBeInTheDocument()
    expect(screen.queryByText(/仅显示摘要/)).not.toBeInTheDocument()
  })

  it('retries through the server with refresh=1', async () => {
    const calls: string[] = []
    mockSources({ server: () => serverContent, onRequest: (u) => calls.push(u) })
    renderReader()
    await screen.findByTestId('reader-frame')
    expect(calls.some((u) => u.includes('/api/reader/2401.00001'))).toBe(true)
    expect(calls.some((u) => u.includes('refresh=1'))).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: '重新获取' }))
    await waitFor(() => expect(calls.some((u) => u.includes('refresh=1'))).toBe(true))
  })

  it('opens the PDF in an iframe when no text source works', async () => {
    mockSources({})
    renderReader()

    expect(await screen.findByText(/无法加载/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '以 PDF 形式阅读' }))
    const frame = await screen.findByTestId('pdf-frame')
    expect(frame.getAttribute('src')).toBe('https://arxiv.org/pdf/2401.00001')
  })
})

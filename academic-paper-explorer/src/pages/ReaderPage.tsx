import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ExternalLink, FileText, Loader2, Languages, Sparkles } from 'lucide-react'
import {
  arxivAbsUrl,
  arxivHtmlUrl,
  arxivPdfUrl,
  classifyReaderError,
  extractOutline,
  fetchWithTimeout,
  HTML_TIMEOUT_MS,
  HttpError,
  isPaperSource,
  readerErrorMessage,
  sanitizeArticleHtml,
  SERVER_TIMEOUT_MS,
  sourceNotice,
  synthesizeArticleHtml,
  withheldNotice,
  type OutlineItem,
  type PaperSource,
  type ReaderContent,
  type ReaderErrorKind,
} from '../lib/article'
import { apiUrl } from '../lib/apiBase'
import { fetchProviders, getCachedTranslation, prepareBrowserTranslator, translate, type PublicProvider } from '../lib/translator'
import { createTranslationQueue } from '../lib/translationQueue'
import AiAssistantPanel from '../components/AiAssistantPanel'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../components/ui/resizable'
import { useReadingStore } from '../store/useReadingStore'
import { READING_STATUSES, type ReadingStatus } from '../lib/reading'
import { useHighlightsStore } from '../store/useHighlightsStore'
import {
  rangeToTarget,
  removeHighlightNodes,
  HIGHLIGHT_COLORS,
  type Highlight,
  type HighlightAnchor,
  type HighlightColor,
} from '../lib/highlights'
import {
  highlightTargets,
  paint,
  repaintTranslations,
  restoreHighlights,
} from '../lib/readerHighlights'
import {
  collectBlocks,
  blockSourceText,
  ensureTranslationStyle,
  failPendingTranslations,
  insertPlaceholder,
  isInTranslateWindow,
  isTranslationReady,
  removeTranslations,
  restoreCachedTranslations,
  toggleTranslation,
  updateTranslation,
  TRANSLATION_ATTR,
  TRANSLATION_FOR_ATTR,
} from '../lib/readerBlocks'

type Status = 'loading' | 'ready' | 'error'

const TARGETS: { value: string; label: string }[] = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
]

const BATCH_SIZE = 4
// Lazy translation prefetch: translate blocks within N viewports above/below
// the visible area, then keep up as the user scrolls.
const TRANSLATE_SCREENS = 2

const ReaderPage: React.FC = () => {
  const { arxivId } = useParams<{ arxivId: string }>()
  const [searchParams] = useSearchParams()
  const readingKey = searchParams.get('pid') || arxivId || ''
  const readingEntry = useReadingStore((s) => s.entries[readingKey])
  const setReadingStatus = useReadingStore((s) => s.setStatus)
  const navigate = useNavigate()
  const location = useLocation()
  // react-router labels the first entry of a session with the "default" key.
  // A reader opened from a blank new tab (or an external link) has nothing
  // in-app to go back to, so stepping through browser history would land on
  // the blank page; go to the papers page instead.
  const canGoBack = location.key !== 'default'
  const goBack = useCallback(() => {
    if (canGoBack) navigate(-1)
    else navigate('/', { replace: true })
  }, [canGoBack, navigate])
  const frameRef = useRef<HTMLIFrameElement>(null)
  const cancelRef = useRef(false)
  const translatingRef = useRef(false)
  const boundDocRef = useRef<Document | null>(null)
  const sessionRef = useRef(0)
  const scrollAbortRef = useRef<AbortController | null>(null)
  const pumpingRef = useRef(0)
  const [status, setStatus] = useState<Status>('loading')
  const [html, setHtml] = useState('')
  const [outline, setOutline] = useState<OutlineItem[]>([])
  const [source, setSource] = useState<PaperSource | null>(null)
  const [withheld, setWithheld] = useState(false)
  const [errorKind, setErrorKind] = useState<ReaderErrorKind>('no-html')
  const [pdfMode, setPdfMode] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  // Set by the retry button so the next load ignores the server-side cache.
  const refreshRef = useRef(false)

  const [providers, setProviders] = useState<PublicProvider[]>([])
  const [providersReady, setProvidersReady] = useState(false)
  const [target, setTarget] = useState('zh')
  const [translated, setTranslated] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [translateError, setTranslateError] = useState<string | null>(null)

  const [aiOpen, setAiOpen] = useState(false)
  const [selection, setSelection] = useState('')

  const blocksRef = useRef<Element[]>([])
  const [pendingAnchor, setPendingAnchor] = useState<HighlightAnchor | null>(null)
  const [pendingText, setPendingText] = useState('')
  const [noteDraft, setNoteDraft] = useState('')
  const [activeHl, setActiveHl] = useState<string | null>(null)
  const addHighlight = useHighlightsStore((s) => s.addHighlight)
  const deleteHighlight = useHighlightsStore((s) => s.deleteHighlight)

  useEffect(() => {
    if (!arxivId) {
      setStatus('error')
      setErrorKind('no-html')
      return
    }
    let cancelled = false
    const refresh = refreshRef.current
    refreshRef.current = false
    const ctrl = new AbortController()
    setStatus('loading')
    setSource(null)
    setWithheld(false)
    setPdfMode(false)
    setTranslated(false)
    setTranslateError(null)
    setProgress({ done: 0, total: 0 })
    boundDocRef.current = null
    translatingRef.current = false
    // Invalidate any in-flight lazy session for the previous paper.
    cancelRef.current = true
    sessionRef.current += 1
    scrollAbortRef.current?.abort()
    scrollAbortRef.current = null

    const showReady = (raw: string, from: PaperSource) => {
      const clean = sanitizeArticleHtml(raw)
      setHtml(clean)
      setOutline(extractOutline(clean))
      setSource(from)
      setStatus('ready')
    }

    const load = async () => {
      // 1) arXiv's own HTML build: full fidelity (figures, math, LaTeXML DOM).
      let htmlError: unknown
      try {
        const res = await fetchWithTimeout(arxivHtmlUrl(arxivId), HTML_TIMEOUT_MS, ctrl.signal)
        if (!res.ok) throw new HttpError(res.status)
        const raw = await res.text()
        if (!cancelled) showReady(raw, 'html')
        return
      } catch (e) {
        htmlError = e
      }
      if (cancelled) return

      // 2) Server-side fallbacks: ar5iv (no CORS header, so the browser cannot
      //    read it) → PDF text → abstract, cached in paper_content.
      try {
        const query = refresh ? '?refresh=1' : ''
        const res = await fetchWithTimeout(
          apiUrl(`/reader/${encodeURIComponent(arxivId)}${query}`),
          SERVER_TIMEOUT_MS,
          ctrl.signal,
        )
        if (!res.ok) throw new HttpError(res.status)
        const body = (await res.json()) as { data?: ReaderContent }
        const data = body?.data
        if (!data?.sections?.length) throw new HttpError(204)
        if (cancelled) return
        setWithheld(Boolean(data.fullTextWithheld))
        showReady(synthesizeArticleHtml(data), isPaperSource(data.source) ? data.source : 'pdf')
      } catch (serverError) {
        if (cancelled) return
        setErrorKind(classifyReaderError(htmlError, serverError))
        setStatus('error')
      }
    }
    void load()

    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [arxivId, reloadKey])

  const retry = useCallback((fresh: boolean) => {
    refreshRef.current = fresh
    setReloadKey((k) => k + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchProviders()
      .then((list) => {
        if (!cancelled) setProviders(list)
      })
      .catch(() => {
        if (!cancelled) setProviders([])
      })
      .finally(() => {
        if (!cancelled) setProvidersReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (status !== 'ready' || !readingKey) return
    const current = useReadingStore.getState().entries[readingKey]?.status
    if (current !== 'done' && current !== 'reading') {
      useReadingStore.getState().setStatus(readingKey, 'reading')
    }
  }, [status, readingKey])

  const jumpTo = useCallback((id: string) => {
    frameRef.current?.contentDocument?.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleFrameLoad = useCallback(() => {
    const doc = frameRef.current?.contentDocument
    if (!doc) return
    // The iframe can fire `load` after images settle, sometimes after the user
    // already started translating. Bind each document exactly once so restore
    // and the delegated listeners are not applied twice.
    if (boundDocRef.current === doc) return
    boundDocRef.current = doc
    const bs = collectBlocks(doc)
    blocksRef.current = bs

    if (!translatingRef.current) {
      const restored = restoreCachedTranslations(doc, bs, (text) => getCachedTranslation(target, text))
      if (restored > 0) {
        ensureTranslationStyle(doc)
        // Fully restored papers show as translated; a partial restore leaves the
        // toggle on "翻译" so the user can lazily fill the rest.
        setTranslated(restored === bs.length)
        setProgress({ done: restored, total: bs.length })
      }
    }

    // Restore after the cached translations exist, so translation anchors find
    // their node to paint onto.
    restoreHighlights(doc, bs, useHighlightsStore.getState().highlights[readingKey] ?? [])

    doc.addEventListener('click', (e) => {
      const mark = (e.target as Element | null)?.closest?.('mark[data-hl-id]') as HTMLElement | null
      if (mark) {
        setActiveHl(mark.getAttribute('data-hl-id'))
        return
      }
      // A click can land right after a drag that selected translated text.
      // Keep the selection (and its pending highlight) instead of folding the
      // translation away underneath it.
      const sel = doc.getSelection()
      if (sel && !sel.isCollapsed && sel.toString().trim()) return
      const node = (e.target as Element | null)?.closest?.(`[${TRANSLATION_ATTR}]`) as HTMLElement | null
      if (!node) return
      // A finished translation is ordinary selectable text. Folding it on any
      // click makes selecting it impossible: the first click of a double-click
      // (the usual way to pick a word) would replace the text with its collapsed
      // label before the word could be selected, and a drag whose endpoints miss
      // the glyphs would fold the block too. So only placeholders fold on a
      // plain click; folding a finished block stays available with Alt+click.
      if (isTranslationReady(node) && !e.altKey) return
      toggleTranslation(node)
      const blockIndex = Number(node.getAttribute(TRANSLATION_FOR_ATTR))
      // Expanding puts the translated text back, so its marks must be repainted.
      if (Number.isInteger(blockIndex) && isTranslationReady(node)) {
        const stored = useHighlightsStore.getState().highlights[readingKey] ?? []
        repaintTranslations(doc, bs, stored, [blockIndex])
      }
      setActiveHl(null)
    })

    doc.addEventListener('mouseup', () => {
      const sel = doc.getSelection()
      const text = sel?.toString().trim() ?? ''
      if (!text || !sel || sel.rangeCount === 0) return
      setSelection(text)
      const anchor = rangeToTarget(sel.getRangeAt(0), highlightTargets(doc, bs))
      if (anchor) {
        setPendingAnchor(anchor)
        setPendingText(text)
      }
    })

    let last = 0
    doc.addEventListener('scroll', () => {
      const now = Date.now()
      if (now - last < 500) return
      last = now
      const el = doc.documentElement
      const max = el.scrollHeight - el.clientHeight
      if (max > 0 && readingKey) {
        useReadingStore.getState().setProgress(readingKey, Math.round((el.scrollTop / max) * 100))
      }
    }, { passive: true })
  }, [readingKey, target])

  const saveHighlight = useCallback(
    (color: HighlightColor) => {
      if (!pendingAnchor) return
      const id = globalThis.crypto?.randomUUID?.() ?? `hl-${Date.now()}`
      const hl: Highlight = {
        id,
        ...pendingAnchor,
        text: pendingText,
        color,
        ...(noteDraft.trim() ? { note: noteDraft.trim() } : {}),
        createdAt: new Date().toISOString(),
      }
      addHighlight(readingKey, hl)
      const doc = frameRef.current?.contentDocument
      if (doc) paint(doc, blocksRef.current, hl)
      setPendingAnchor(null)
      setPendingText('')
      setNoteDraft('')
    },
    [pendingAnchor, pendingText, noteDraft, readingKey, addHighlight],
  )

  const deleteActiveHighlight = useCallback(() => {
    if (!activeHl) return
    deleteHighlight(readingKey, activeHl)
    const doc = frameRef.current?.contentDocument
    if (doc) removeHighlightNodes(doc, activeHl)
    setActiveHl(null)
  }, [activeHl, readingKey, deleteHighlight])

  const recolorActiveHighlight = useCallback(
    (color: HighlightColor) => {
      if (!activeHl) return
      const list = useHighlightsStore.getState().highlights[readingKey] ?? []
      const hl = list.find((h) => h.id === activeHl)
      if (!hl) return
      const doc = frameRef.current?.contentDocument
      if (doc) removeHighlightNodes(doc, activeHl)
      deleteHighlight(readingKey, activeHl)
      const next: Highlight = { ...hl, color }
      addHighlight(readingKey, next)
      if (doc) paint(doc, blocksRef.current, next)
    },
    [activeHl, readingKey, deleteHighlight, addHighlight],
  )

  const stopTranslate = useCallback((doc: Document | null) => {
    cancelRef.current = true
    translatingRef.current = false
    sessionRef.current += 1
    scrollAbortRef.current?.abort()
    scrollAbortRef.current = null
    if (doc) removeTranslations(doc)
    // A translation highlight's marks vanish with its node; close the bar so it
    // does not offer to edit something that is no longer on screen.
    const active = activeHl
    const stored = useHighlightsStore.getState().highlights[readingKey] ?? []
    if (active && stored.some((h) => h.id === active && h.surface === 'translation')) {
      setActiveHl(null)
    }
    setTranslated(false)
    setTranslating(false)
    setProgress({ done: 0, total: 0 })
    setTranslateError(null)
  }, [activeHl, readingKey])

  const startTranslate = useCallback(
    (lang: string, doc: Document, blocks: Element[]) => {
      if (providers.some((p) => p.kind === 'browser')) prepareBrowserTranslator(lang)
      cancelRef.current = false
      translatingRef.current = true
      const session = ++sessionRef.current

      const done = new Set<number>()
      blocks.forEach((_, i) => {
        if (doc.querySelector(`[${TRANSLATION_FOR_ATTR}="${i}"]`)) done.add(i)
      })
      const queue = createTranslationQueue(blocks.length, done)

      ensureTranslationStyle(doc)
      setTranslated(true)
      setTranslating(true)
      setTranslateError(null)
      setProgress({ done: queue.doneCount(), total: blocks.length })

      const stale = () => sessionRef.current !== session || cancelRef.current

      // Drain queued blocks in document order. The observer keeps adding to the
      // queue as the user scrolls, so each await re-checks for more work.
      const pump = async (): Promise<void> => {
        if (pumpingRef.current === session || stale()) return
        pumpingRef.current = session
        try {
          while (!stale()) {
            const batch = queue.takeBatch(BATCH_SIZE)
            if (batch.length === 0) break
            batch.forEach((i) => insertPlaceholder(doc, blocks[i], String(i)))
            const texts = batch.map((i) => blockSourceText(blocks[i]))
            const result = await translate(texts, lang)
            if (stale()) break
            batch.forEach((i, k) => updateTranslation(doc, String(i), result.translations[k]))
            batch.forEach((i) => queue.markDone(i))
            // Finishing a batch rewrote those nodes' text; put their stored
            // highlights back on top of the fresh translation.
            const stored = useHighlightsStore.getState().highlights[readingKey] ?? []
            repaintTranslations(doc, blocks, stored, batch)
            setProgress({ done: queue.doneCount(), total: blocks.length })
          }
        } catch (e) {
          if (!stale()) {
            failPendingTranslations(doc)
            setTranslateError(e instanceof Error ? e.message : '翻译失败')
          }
        } finally {
          if (pumpingRef.current === session) pumpingRef.current = 0
          if (!stale() && !queue.isIdle()) {
            void pump()
          } else if (!stale()) {
            setTranslating(false)
          }
        }
      }

      // Enqueue blocks within the prefetch window. `getBoundingClientRect` is
      // relative to the iframe viewport, so this tracks the iframe's own scroll
      // reliably (an IntersectionObserver rooted at the parent frame does not
      // update for in-iframe scrolling). `isInTranslateWindow` also keeps
      // hidden blocks (arXiv's collapsed TOC and dialogs) from squatting in the
      // queue ahead of the visible text.
      let scheduled = false
      const scan = () => {
        scheduled = false
        if (stale()) return
        const viewport = doc.documentElement.clientHeight
        const margin = viewport * TRANSLATE_SCREENS
        let added = false
        for (let i = 0; i < blocks.length; i++) {
          if (queue.isDone(i)) continue
          if (isInTranslateWindow(blocks[i].getBoundingClientRect(), viewport, margin)) {
            if (queue.enqueue(i)) added = true
          }
        }
        if (added) void pump()
      }
      const scheduleScan = () => {
        if (scheduled || stale()) return
        scheduled = true
        const view = doc.defaultView
        if (view) view.requestAnimationFrame(scan)
        else setTimeout(scan, 100)
      }

      const abort = new AbortController()
      scrollAbortRef.current = abort
      doc.addEventListener('scroll', scheduleScan, { passive: true, signal: abort.signal })
      scan()
    },
    [providers, readingKey],
  )

  const toggleTranslate = useCallback(() => {
    const doc = frameRef.current?.contentDocument
    if (!doc) return
    if (translated || translating) {
      stopTranslate(doc)
      return
    }
    const blocks = collectBlocks(doc)
    if (blocks.length === 0) return
    startTranslate(target, doc, blocks)
  }, [translated, translating, target, stopTranslate, startTranslate])

  const onTargetChange = useCallback(
    (value: string) => {
      setTarget(value)
      const doc = frameRef.current?.contentDocument
      if ((translated || translating) && doc) {
        stopTranslate(doc)
        const blocks = collectBlocks(doc)
        if (blocks.length > 0) startTranslate(value, doc, blocks)
      }
    },
    [translated, translating, stopTranslate, startTranslate],
  )

  const aiEnabled = providers.some((p) => p.kind === 'openai')

  useEffect(() => () => {
    cancelRef.current = true
    sessionRef.current += 1
    scrollAbortRef.current?.abort()
    scrollAbortRef.current = null
  }, [])

  const abs = arxivId ? arxivAbsUrl(arxivId) : '#'
  const pdf = arxivId ? arxivPdfUrl(arxivId) : '#'
  const noProviders = providersReady && providers.length === 0
  const notice = withheld ? withheldNotice() : sourceNotice(source)

  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white">
      <header className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4" /> 返回
          </button>
          <span className="truncate text-sm text-gray-300">arXiv:{arxivId}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTranslate}
              disabled={status !== 'ready' || noProviders}
              title={noProviders ? '未配置可用的翻译 provider' : undefined}
              className="flex items-center gap-1 rounded bg-purple-600 px-3 py-1 text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:text-gray-400"
            >
              {translating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
              {translated ? '隐藏译文' : '翻译'}
            </button>
            <select
              aria-label="目标语言"
              value={target}
              onChange={(e) => onTargetChange(e.target.value)}
              disabled={translating}
              className="rounded bg-gray-700 px-2 py-1 text-sm"
            >
              {TARGETS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {translating && (
              <span className="text-xs text-gray-400">
                {progress.done}/{progress.total}
              </span>
            )}
          </div>
          <select
            aria-label="阅读状态"
            value={readingEntry?.status ?? ''}
            onChange={(e) => setReadingStatus(readingKey, (e.target.value || null) as ReadingStatus | null)}
            className="rounded bg-gray-700 px-2 py-1 text-sm"
          >
            <option value="">未标记</option>
            {READING_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {typeof readingEntry?.progress === 'number' && (
            <span className="text-xs text-gray-400">{readingEntry.progress}%</span>
          )}
          <button
            type="button"
            onClick={() => setAiOpen((o) => !o)}
            disabled={!aiEnabled}
            title={!aiEnabled ? '未配置可用的 AI provider（问答需要后端 LLM）' : undefined}
            className="flex items-center gap-1 rounded bg-indigo-600 px-3 py-1 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-600 disabled:text-gray-400"
          >
            <Sparkles className="h-3 w-3" /> AI 助手
          </button>
          <a
            href={abs}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
          >
            arXiv <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href={pdf}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-green-400 hover:text-green-300"
          >
            PDF <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>

      {translateError && (
        <div className="border-b border-red-800 bg-red-900/40 px-4 py-1 text-xs text-red-300">
          翻译失败：{translateError}
        </div>
      )}

      {/* 目录 / 正文 / AI 助手：面板宽度可拖拽调整 */}
      <ResizablePanelGroup direction="horizontal" autoSaveId="cpe:reader-layout" className="flex-1">
        <ResizablePanel
          id="outline"
          order={1}
          defaultSize={16}
          minSize={10}
          maxSize={35}
          className="bg-gray-800"
        >
          <aside className="h-full overflow-y-auto p-3">
            <h2 className="mb-2 text-xs font-semibold uppercase text-gray-400">目录</h2>
            {outline.length === 0 ? (
              <p className="text-xs text-gray-500">无可用目录</p>
            ) : (
              <ul className="space-y-1">
                {outline.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => jumpTo(item.id)}
                      className="w-full truncate rounded px-2 py-1 text-left text-sm text-gray-300 hover:bg-gray-700"
                      style={{ paddingLeft: 8 + (item.level - 1) * 12 }}
                    >
                      {item.text}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel
          id="article"
          order={2}
          minSize={30}
          tagName="main"
          className="relative flex h-full flex-col bg-white"
        >
          {(pendingAnchor || activeHl) && (
            <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-gray-800/95 px-3 py-2 text-xs text-white shadow-lg">
              {pendingAnchor ? (
                <>
                  {pendingAnchor.surface === 'translation' && (
                    <span className="rounded bg-blue-600/80 px-1 py-0.5 text-[10px] text-blue-50">译文</span>
                  )}
                  <span className="max-w-[14rem] truncate text-gray-300">{pendingText}</span>
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      aria-label={`高亮-${c.label}`}
                      onClick={() => saveHighlight(c.value)}
                      className="h-4 w-4 rounded"
                      style={{ backgroundColor: c.css }}
                    />
                  ))}
                  <input
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="备注(可选)"
                    className="w-28 rounded bg-gray-900 px-2 py-1 outline-none placeholder:text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => saveHighlight('yellow')}
                    className="rounded bg-amber-600 px-2 py-0.5 hover:bg-amber-500"
                  >
                    批注
                  </button>
                  <button
                    type="button"
                    aria-label="取消高亮"
                    onClick={() => {
                      setPendingAnchor(null)
                      setPendingText('')
                      setNoteDraft('')
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <span className="text-gray-300">高亮</span>
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      aria-label={`改色-${c.label}`}
                      onClick={() => recolorActiveHighlight(c.value)}
                      className="h-4 w-4 rounded"
                      style={{ backgroundColor: c.css }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={deleteActiveHighlight}
                    className="rounded bg-red-600 px-2 py-0.5 hover:bg-red-500"
                  >
                    删除
                  </button>
                  <button
                    type="button"
                    aria-label="关闭高亮操作"
                    onClick={() => setActiveHl(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          )}
          {status === 'ready' && notice && (
            <div className="flex items-center gap-3 border-b border-amber-300 bg-amber-50 px-4 py-1.5 text-xs text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="flex-1">{notice}</span>
              <button
                type="button"
                onClick={() => retry(true)}
                className="flex-shrink-0 rounded border border-amber-400 px-2 py-0.5 hover:bg-amber-100"
              >
                重新获取
              </button>
              <a href={pdf} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 underline">
                查看 PDF
              </a>
            </div>
          )}
          {status === 'loading' && (
            <div className="flex flex-1 items-center justify-center bg-gray-900 text-gray-300">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 正在加载论文…
            </div>
          )}
          {status === 'error' && !pdfMode && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-gray-900 text-center">
              <FileText className="h-10 w-10 text-gray-500" />
              <p className="text-gray-300">无法加载该论文的 HTML 版本</p>
              <p className="text-sm text-gray-500">{readerErrorMessage(errorKind)}</p>
              <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => retry(true)}
                  className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-500"
                >
                  重试
                </button>
                <button
                  type="button"
                  onClick={() => setPdfMode(true)}
                  className="rounded border border-gray-600 px-3 py-1 text-gray-200 hover:bg-gray-800"
                >
                  以 PDF 形式阅读
                </button>
                <a
                  href={abs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  在 arXiv 打开
                </a>
                <a
                  href={pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300"
                >
                  下载/查看 PDF
                </a>
              </div>
            </div>
          )}
          {status === 'error' && pdfMode && (
            <iframe
              title="arXiv PDF"
              data-testid="pdf-frame"
              className="w-full flex-1 border-0"
              src={pdf}
            />
          )}
          {status === 'ready' && (
            <iframe
              ref={frameRef}
              data-testid="reader-frame"
              title="arXiv HTML"
              className="w-full flex-1 border-0"
              sandbox="allow-same-origin"
              srcDoc={html}
              onLoad={handleFrameLoad}
            />
          )}
        </ResizablePanel>

        {aiOpen && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel id="ai" order={3} defaultSize={24} minSize={16} maxSize={50} className="bg-gray-800">
              <AiAssistantPanel
                arxivId={arxivId ?? readingKey}
                selection={selection}
                target={target}
                onClose={() => setAiOpen(false)}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  )
}

export default ReaderPage

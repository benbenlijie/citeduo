export const BLOCK_SELECTOR = 'p, li, blockquote, figcaption, h2, h3, h4, td'
export const SOURCE_ATTR = 'data-cn-src'
export const TRANSLATION_ATTR = 'data-cn-translation'
export const TRANSLATION_FOR_ATTR = 'data-cn-for'
const TRANSLATION_FULL_ATTR = 'data-cn-full'
export const COLLAPSED_CLASS = 'cn-translation--collapsed'
const COLLAPSED_LABEL = '译文已折叠，点击展开'
export const PENDING_CLASS = 'cn-translation--pending'
const PENDING_LABEL = '翻译中…'
export const FAILED_CLASS = 'cn-translation--failed'
const FAILED_LABEL = '翻译失败'

const HAS_LETTER = /[A-Za-z\u00C0-\u024F\u0400-\u04FF]/

export function isTranslatableBlock(el: Element): boolean {
  if (el.hasAttribute(TRANSLATION_FOR_ATTR) || el.hasAttribute(TRANSLATION_ATTR)) return false
  const text = (el.textContent ?? '').trim()
  if (text.length < 2) return false
  if (!HAS_LETTER.test(text)) return false
  return true
}

export function collectBlocks(doc: Document): Element[] {
  const out: Element[] = []
  for (const el of Array.from(doc.querySelectorAll(BLOCK_SELECTOR))) {
    if (!isTranslatableBlock(el)) continue
    if (out.some((parent) => parent !== el && parent.contains(el))) continue
    out.push(el)
  }
  return out
}

export function markBlock(el: Element, id: string): void {
  el.setAttribute(SOURCE_ATTR, id)
}

/**
 * Whether a block belongs in the lazy-translation prefetch window, given its
 * layout rect, the viewport height and how far ahead to prefetch.
 *
 * arXiv HTML hides a whole table of contents and a "report an issue" dialog in
 * every paper. `display:none` blocks report an all-zero rect, which always looks
 * like it sits at the top of the viewport, so they used to be queued ahead of
 * the visible text and burn the translation budget on content nobody can see
 * (one paper: 99 of 297 blocks). They are skipped whenever the document really
 * has layout; a zero-height viewport means no layout at all (jsdom, a hidden
 * iframe), where every rect is zero and filtering would drop everything.
 */
export function isInTranslateWindow(
  rect: { top: number; bottom: number; width: number; height: number },
  viewport: number,
  margin: number,
): boolean {
  if (viewport > 0 && rect.width === 0 && rect.height === 0) return false
  return rect.bottom >= -margin && rect.top <= viewport + margin
}

/**
 * Plain text to send to the translator for a block. Reads a clone so that
 * - the MathML `<annotation>` (raw LaTeX) is dropped: `textContent` would
 *   otherwise emit the visible glyphs *and* the LaTeX, duplicating formulas
 *   (e.g. `x1x_{1}`);
 * - inserted translation nodes are ignored, so a placeholder appended inside a
 *   table cell is never mistaken for source text (which previously leaked the
 *   literal "翻译中…" into the finished translation).
 */
export function blockSourceText(el: Element): string {
  const clone = el.cloneNode(true) as Element
  clone
    .querySelectorAll(`annotation, script, style, [${TRANSLATION_ATTR}]`)
    .forEach((node) => node.remove())
  return (clone.textContent ?? '').trim()
}

/**
 * Insert finished translations for blocks whose source text is already cached,
 * so a page reload restores prior output without re-translating. Returns the
 * number restored; blocks without a hit are left untouched (no placeholder).
 */
export function restoreCachedTranslations(
  doc: Document,
  blocks: Element[],
  lookup: (text: string) => string | undefined,
): number {
  let restored = 0
  blocks.forEach((el, i) => {
    const translated = lookup(blockSourceText(el))
    if (!translated) return
    const id = String(i)
    markBlock(el, id)
    if (doc.querySelector(`[${TRANSLATION_FOR_ATTR}="${id}"]`)) {
      updateTranslation(doc, id, translated)
    } else {
      insertTranslation(doc, el, id, translated)
    }
    restored += 1
  })
  return restored
}

export function insertTranslation(doc: Document, block: Element, id: string, text: string): Element {
  const node = doc.createElement('div')
  node.setAttribute(TRANSLATION_ATTR, '')
  node.setAttribute(TRANSLATION_FOR_ATTR, id)
  node.className = 'cn-translation'
  node.textContent = text
  if (block.tagName === 'TD' || block.tagName === 'TH') block.appendChild(node)
  else block.insertAdjacentElement('afterend', node)
  return node
}

/** Insert (or reuse) a per-block placeholder so each segment shows immediate
 * feedback while its translation is still in flight. */
export function insertPlaceholder(doc: Document, block: Element, id: string): Element {
  let node = doc.querySelector<HTMLElement>(`[${TRANSLATION_FOR_ATTR}="${id}"]`)
  if (!node) node = insertTranslation(doc, block, id, '') as HTMLElement
  node.classList.remove(COLLAPSED_CLASS)
  node.classList.remove(FAILED_CLASS)
  node.removeAttribute(TRANSLATION_FULL_ATTR)
  node.classList.add(PENDING_CLASS)
  node.textContent = PENDING_LABEL
  return node
}

/** Fill in a placeholder with its finished translation. */
export function updateTranslation(doc: Document, id: string, text: string): void {
  const node = doc.querySelector<HTMLElement>(`[${TRANSLATION_FOR_ATTR}="${id}"]`)
  if (!node) return
  node.classList.remove(PENDING_CLASS)
  node.classList.remove(COLLAPSED_CLASS)
  node.classList.remove(FAILED_CLASS)
  node.removeAttribute(TRANSLATION_FULL_ATTR)
  node.textContent = text
}

/** Mark any still-pending placeholders as failed, keeping finished segments. */
export function failPendingTranslations(doc: Document): void {
  doc.querySelectorAll<HTMLElement>(`[${TRANSLATION_ATTR}].${PENDING_CLASS}`).forEach((el) => {
    el.classList.remove(PENDING_CLASS)
    el.classList.add(FAILED_CLASS)
    el.textContent = FAILED_LABEL
  })
}

export function removeTranslations(doc: Document): void {
  doc.querySelectorAll(`[${TRANSLATION_ATTR}]`).forEach((el) => el.remove())
  doc.querySelectorAll(`[${SOURCE_ATTR}]`).forEach((el) => el.removeAttribute(SOURCE_ATTR))
}

/** Resolve the translation node inserted for a source block index, if any. */
export function translationNodeFor(doc: Document, blockIndex: number): HTMLElement | null {
  return doc.querySelector<HTMLElement>(`[${TRANSLATION_ATTR}][${TRANSLATION_FOR_ATTR}="${blockIndex}"]`)
}

/**
 * True when a translation node currently renders its finished text, so
 * character offsets recorded against it still line up. Pending placeholders,
 * collapsed placeholders and failed nodes show sentinel text instead, so
 * highlights must not be painted (or read) there.
 */
export function isTranslationReady(node: Element | null): node is HTMLElement {
  if (!node) return false
  return (
    !node.classList.contains(PENDING_CLASS) &&
    !node.classList.contains(COLLAPSED_CLASS) &&
    !node.classList.contains(FAILED_CLASS)
  )
}

/** Every translation node that is ready to be highlighted, each with the source
 * block index it was inserted for. */
export function readyTranslationNodes(doc: Document): { blockIndex: number; element: HTMLElement }[] {
  const out: { blockIndex: number; element: HTMLElement }[] = []
  doc
    .querySelectorAll<HTMLElement>(`[${TRANSLATION_ATTR}][${TRANSLATION_FOR_ATTR}]`)
    .forEach((element) => {
      const blockIndex = Number(element.getAttribute(TRANSLATION_FOR_ATTR))
      if (!Number.isInteger(blockIndex) || !isTranslationReady(element)) return
      out.push({ blockIndex, element })
    })
  return out
}

/** Fold/unfold a single translation node. Collapsed nodes keep a visible
 * placeholder so the toggle can be reversed with another click. */
export function toggleTranslation(node: HTMLElement): void {
  if (node.classList.contains(COLLAPSED_CLASS)) {
    const full = node.getAttribute(TRANSLATION_FULL_ATTR)
    node.classList.remove(COLLAPSED_CLASS)
    if (full !== null) {
      node.textContent = full
      node.removeAttribute(TRANSLATION_FULL_ATTR)
    }
  } else {
    node.setAttribute(TRANSLATION_FULL_ATTR, node.textContent ?? '')
    node.classList.add(COLLAPSED_CLASS)
    node.textContent = COLLAPSED_LABEL
  }
}

export function setTranslationsVisible(doc: Document, visible: boolean): void {
  doc.querySelectorAll<HTMLElement>(`[${TRANSLATION_ATTR}]`).forEach((el) => {
    el.style.display = visible ? '' : 'none'
  })
}

export function ensureTranslationStyle(doc: Document): void {
  if (doc.querySelector('style[data-cn-style]')) return
  const style = doc.createElement('style')
  style.setAttribute('data-cn-style', '')
  style.textContent =
    '.cn-translation{margin:6px 0 14px;padding:8px 10px;border-left:3px solid #60a5fa;' +
    'background:rgba(96,165,250,.08);color:#1f2937;font-size:15px;line-height:1.7;border-radius:4px;cursor:pointer}' +
    `.cn-translation.${COLLAPSED_CLASS}{padding:4px 10px;font-size:12px;color:#6b7280;font-style:italic;` +
    'background:rgba(107,114,128,.08);border-left-color:#9ca3af}' +
    `.cn-translation.${PENDING_CLASS}{color:#9ca3af;font-style:italic;` +
    'background:rgba(156,163,175,.10);border-left-color:#d1d5db}' +
    `.cn-translation.${FAILED_CLASS}{color:#b91c1c;font-style:italic;` +
    'background:rgba(239,68,68,.08);border-left-color:#fca5a5}' +
    // Keep annotated text readable on the tinted translation background.
    'mark[data-hl-id]{border-radius:2px;color:inherit}'
  doc.head.appendChild(style)
}

export function ensureReaderStyle(doc: Document): void {
  if (doc.querySelector('style[data-cn-reader-style]')) return
  const style = doc.createElement('style')
  style.setAttribute('data-cn-reader-style', '')
  style.textContent = `
@media (max-width: 1023px) {
  html, body { max-width: 100% !important; overflow-x: hidden !important; }
  .arxiv-html-site-chrome, .ltx_page_navbar, .arxiv-html-footer, .ds-site-footer, .ds-skip-link { display: none !important; }
  .ltx_page_main { box-sizing: border-box !important; width: 100% !important; max-width: 100% !important; padding-left: 12px !important; padding-right: 12px !important; }
  .ltx_page_content, .ltx_page_logo { max-width: 100% !important; width: 100% !important; }
  .ltx_flex_figure, .ltx_flex_cell, .ltx_transformed_outer, .ltx_transformed_inner { max-width: 100% !important; width: 100% !important; min-width: 0 !important; transform: none !important; }
  .ltx_tabular { display: block !important; width: 100% !important; max-width: 100% !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
  .ltx_tabular > tbody { display: table !important; width: max-content !important; min-width: 100% !important; }
  .ltx_figure, .ltx_table, figure { max-width: 100% !important; overflow-x: auto !important; }
  .ltx_equation, .ltx_eqn_table, .ltx_math { max-width: 100% !important; overflow-x: auto !important; }
  .ltx_personname { display: block !important; line-height: 1.6 !important; }
  img, svg { max-width: 100% !important; height: auto !important; }
}
`
  doc.head.appendChild(style)
}

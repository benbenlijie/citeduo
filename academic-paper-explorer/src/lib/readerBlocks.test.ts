import { describe, it, expect } from 'vitest'
import {
  collectBlocks,
  blockSourceText,
  markBlock,
  insertTranslation,
  insertPlaceholder,
  updateTranslation,
  failPendingTranslations,
  removeTranslations,
  restoreCachedTranslations,
  setTranslationsVisible,
  toggleTranslation,
  ensureTranslationStyle,
  ensureReaderStyle,
  translationNodeFor,
  isInTranslateWindow,
  isTranslationReady,
  readyTranslationNodes,
  SOURCE_ATTR,
  TRANSLATION_ATTR,
} from './readerBlocks'

function doc(html: string): Document {
  return new DOMParser().parseFromString(`<html><body>${html}</body></html>`, 'text/html')
}

describe('collectBlocks', () => {
  it('selects text-bearing blocks and skips empty or numeric-only ones', () => {
    const d = doc('<p>Real sentence here.</p><p>42</p><p>   </p><h2>Intro</h2><li>Item text</li>')
    const texts = collectBlocks(d).map((el) => el.textContent)
    expect(texts).toEqual(['Real sentence here.', 'Intro', 'Item text'])
  })

  it('skips a paragraph nested inside an already-selected block', () => {
    const d = doc('<li>Outer item<p>Inner paragraph text</p></li>')
    const blocks = collectBlocks(d)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].textContent).toBe('Outer itemInner paragraph text')
  })

  it('skips existing translation nodes', () => {
    const d = doc('<p data-cn-for="1">translated text</p><p>Original text</p>')
    expect(collectBlocks(d).map((el) => el.textContent)).toEqual(['Original text'])
  })

  it('returns an empty list for a document with no blocks', () => {
    expect(collectBlocks(doc('<div>no block elements</div>'))).toEqual([])
  })
})

describe('blockSourceText', () => {
  it('does not duplicate the LaTeX carried in a MathML annotation', () => {
    const d = doc(
      '<p>Given <math><semantics><mrow><mi>x</mi><mn>1</mn></mrow>' +
        '<annotation encoding="application/x-tex">x_{1}</annotation></semantics></math> sample</p>',
    )
    expect(blockSourceText(collectBlocks(d)[0])).toBe('Given x1 sample')
  })

  it('ignores an inserted translation placeholder inside a table cell', () => {
    const d = doc('<table><tr><td>Cell text here</td></tr></table>')
    const cell = collectBlocks(d)[0]
    markBlock(cell, '0')
    insertPlaceholder(d, cell, '0')
    expect(blockSourceText(cell)).toBe('Cell text here')
  })
})

describe('markBlock / insertTranslation', () => {
  it('marks a source block and inserts a sibling translation', () => {
    const d = doc('<p>Hello world</p>')
    const block = collectBlocks(d)[0]
    markBlock(block, '0')
    expect(block.getAttribute(SOURCE_ATTR)).toBe('0')

    const node = insertTranslation(d, block, '0', '你好，世界')
    expect(node.getAttribute(TRANSLATION_ATTR)).toBe('')
    expect(node.textContent).toBe('你好，世界')
    expect(block.nextElementSibling).toBe(node)
  })

  it('inserts table-cell translations inside the cell', () => {
    const d = doc('<table><tr><td>Cell text here</td></tr></table>')
    const cell = collectBlocks(d)[0]
    const node = insertTranslation(d, cell, '0', '单元格')
    expect(cell.contains(node)).toBe(true)
  })
})

describe('removeTranslations / setTranslationsVisible', () => {
  it('removes inserted translations and source markers', () => {
    const d = doc('<p>Hello world</p>')
    const block = collectBlocks(d)[0]
    markBlock(block, '0')
    insertTranslation(d, block, '0', '你好')
    removeTranslations(d)
    expect(d.body.innerHTML).not.toContain('data-cn')
    expect(d.body.innerHTML).toContain('Hello world')
  })

  it('toggles visibility of translation nodes', () => {
    const d = doc('<p>Hello world</p>')
    const block = collectBlocks(d)[0]
    const node = insertTranslation(d, block, '0', '你好')
    setTranslationsVisible(d, false)
    expect((node as HTMLElement).style.display).toBe('none')
    setTranslationsVisible(d, true)
    expect((node as HTMLElement).style.display).toBe('')
  })
})

describe('isInTranslateWindow', () => {
  const rect = (top: number, bottom: number, width = 800, height = 20) => ({ top, bottom, width, height })

  it('keeps blocks inside the prefetch window', () => {
    expect(isInTranslateWindow(rect(0, 20), 800, 1600)).toBe(true)
  })

  it('keeps blocks just above the viewport, within the prefetch margin', () => {
    expect(isInTranslateWindow(rect(-500, -480), 800, 1600)).toBe(true)
  })

  it('drops blocks past the prefetch window', () => {
    expect(isInTranslateWindow(rect(4000, 4020), 800, 1600)).toBe(false)
  })

  it('drops hidden blocks, whose zero rect always looks in view', () => {
    // A collapsed `nav.ltx_TOC` item reports top/bottom/width/height of 0, which
    // trivially passes the window test.
    expect(isInTranslateWindow(rect(0, 0, 0, 0), 800, 1600)).toBe(false)
  })

  it('still queues everything when the document has no layout', () => {
    // jsdom (and a hidden iframe) report a zero viewport and zero rects for all
    // blocks, so filtering by rect there would translate nothing at all.
    expect(isInTranslateWindow(rect(0, 0, 0, 0), 0, 0)).toBe(true)
  })
})

describe('toggleTranslation', () => {
  function make(html = '你好，世界'): { node: HTMLElement } {
    const d = doc('<p>Hello world</p>')
    const block = collectBlocks(d)[0]
    return { node: insertTranslation(d, block, '0', html) as HTMLElement }
  }

  it('collapses to a visible placeholder instead of vanishing', () => {
    const { node } = make()
    toggleTranslation(node)
    expect(node.textContent).not.toBe('')
    expect(node.classList.contains('cn-translation--collapsed')).toBe(true)
    expect((node as HTMLElement).style.display).not.toBe('none')
    expect(node.getAttribute(TRANSLATION_ATTR)).toBe('')
  })

  it('restores the full text on a second click', () => {
    const { node } = make('你好，世界')
    toggleTranslation(node)
    toggleTranslation(node)
    expect(node.textContent).toBe('你好，世界')
    expect(node.classList.contains('cn-translation--collapsed')).toBe(false)
  })
})

describe('progressive translations', () => {
  it('inserts a pending placeholder and reuses it on repeat calls', () => {
    const d = doc('<p>Hello world</p>')
    const block = collectBlocks(d)[0]
    markBlock(block, '0')
    const node = insertPlaceholder(d, block, '0') as HTMLElement
    expect(node.textContent).toBe('翻译中…')
    expect(node.classList.contains('cn-translation--pending')).toBe(true)
    const again = insertPlaceholder(d, block, '0')
    expect(again).toBe(node)
    expect(d.querySelectorAll(`[${TRANSLATION_ATTR}]`)).toHaveLength(1)
  })

  it('fills a placeholder and clears the pending state', () => {
    const d = doc('<p>Hello world</p>')
    const block = collectBlocks(d)[0]
    markBlock(block, '0')
    const node = insertPlaceholder(d, block, '0') as HTMLElement
    updateTranslation(d, '0', '你好，世界')
    expect(node.textContent).toBe('你好，世界')
    expect(node.classList.contains('cn-translation--pending')).toBe(false)
  })

  it('marks still-pending nodes failed while keeping finished ones', () => {
    const d = doc('<p>One here</p><p>Two here</p>')
    const blocks = collectBlocks(d)
    blocks.forEach((b, i) => {
      markBlock(b, String(i))
      insertPlaceholder(d, b, String(i))
    })
    updateTranslation(d, '0', '第一')
    failPendingTranslations(d)
    const nodes = d.querySelectorAll<HTMLElement>(`[${TRANSLATION_ATTR}]`)
    expect(nodes[0].textContent).toBe('第一')
    expect(nodes[1].textContent).toBe('翻译失败')
  })
})

describe('ensureTranslationStyle', () => {
  it('injects the style tag once', () => {
    const d = doc('<p>Hello world</p>')
    ensureTranslationStyle(d)
    ensureTranslationStyle(d)
    expect(d.querySelectorAll('style[data-cn-style]')).toHaveLength(1)
  })
})

describe('ensureReaderStyle', () => {
  it('injects the mobile reader overrides once', () => {
    const d = doc('<p>Hello world</p>')
    ensureReaderStyle(d)
    ensureReaderStyle(d)
    const styles = d.querySelectorAll('style[data-cn-reader-style]')
    expect(styles).toHaveLength(1)
    expect(styles[0].textContent).toContain('.arxiv-html-site-chrome')
    expect(styles[0].textContent).toContain('overflow-x: auto')
  })
})

describe('restoreCachedTranslations', () => {
  it('inserts finished translations for blocks that have a cache hit', () => {
    const d = doc('<p>Hello world</p><p>Second block</p>')
    const blocks = collectBlocks(d)
    const n = restoreCachedTranslations(d, blocks, (text) =>
      text === 'Hello world' ? '你好，世界' : undefined,
    )
    expect(n).toBe(1)
    const node = d.querySelector<HTMLElement>(`[${TRANSLATION_ATTR}]`)
    expect(node?.textContent).toBe('你好，世界')
    expect(node?.classList.contains('cn-translation--pending')).toBe(false)
    expect(blocks[0].getAttribute(SOURCE_ATTR)).toBe('0')
  })

  it('returns zero and inserts nothing when the cache is cold', () => {
    const d = doc('<p>Hello world</p>')
    const blocks = collectBlocks(d)
    expect(restoreCachedTranslations(d, blocks, () => undefined)).toBe(0)
    expect(d.querySelectorAll(`[${TRANSLATION_ATTR}]`)).toHaveLength(0)
  })

  it('reuses an in-flight placeholder instead of inserting a duplicate', () => {
    const d = doc('<p>Hello world</p>')
    const blocks = collectBlocks(d)
    markBlock(blocks[0], '0')
    insertPlaceholder(d, blocks[0], '0')
    restoreCachedTranslations(d, blocks, () => '你好，世界')
    const nodes = d.querySelectorAll<HTMLElement>(`[${TRANSLATION_ATTR}]`)
    expect(nodes).toHaveLength(1)
    expect(nodes[0].textContent).toBe('你好，世界')
    expect(nodes[0].classList.contains('cn-translation--pending')).toBe(false)
  })

  it('is idempotent when run twice for the same document', () => {
    const d = doc('<p>Hello world</p>')
    const blocks = collectBlocks(d)
    restoreCachedTranslations(d, blocks, () => '你好')
    restoreCachedTranslations(d, blocks, () => '你好')
    expect(d.querySelectorAll(`[${TRANSLATION_ATTR}]`)).toHaveLength(1)
  })
})

describe('translation highlighting helpers', () => {
  it('resolves a translation node by its source block index', () => {
    const d = doc('<p>Hello world</p>')
    insertTranslation(d, collectBlocks(d)[0], '3', '你好')
    expect(translationNodeFor(d, 3)?.textContent).toBe('你好')
    expect(translationNodeFor(d, 4)).toBeNull()
  })

  it('only reports finished nodes as ready to highlight', () => {
    const d = doc('<p>One here</p><p>Two here</p><p>Third here</p>')
    const blocks = collectBlocks(d)
    const pending = insertPlaceholder(d, blocks[0], '0') as HTMLElement
    insertPlaceholder(d, blocks[1], '1')
    const finished = insertTranslation(d, blocks[2], '2', '第三') as HTMLElement
    failPendingTranslations(d)

    expect(isTranslationReady(null)).toBe(false)
    expect(isTranslationReady(pending)).toBe(false)
    expect(pending.classList.contains('cn-translation--failed')).toBe(true)
    expect(finished.classList.contains('cn-translation--failed')).toBe(false)
    expect(isTranslationReady(finished)).toBe(true)
    expect(readyTranslationNodes(d).map((r) => r.blockIndex)).toEqual([2])
  })

  it('drops the failed mark when a block is retried', () => {
    const d = doc('<p>Hello world</p>')
    const block = collectBlocks(d)[0]
    markBlock(block, '0')
    insertPlaceholder(d, block, '0')
    failPendingTranslations(d)
    updateTranslation(d, '0', '你好，世界')
    expect(isTranslationReady(translationNodeFor(d, 0))).toBe(true)
  })

  it('reports a collapsed node as unavailable until it is expanded again', () => {
    const d = doc('<p>Hello world</p>')
    const node = insertTranslation(d, collectBlocks(d)[0], '0', '你好') as HTMLElement
    toggleTranslation(node)
    expect(isTranslationReady(node)).toBe(false)
    expect(readyTranslationNodes(d)).toHaveLength(0)
    toggleTranslation(node)
    expect(isTranslationReady(node)).toBe(true)
    expect(readyTranslationNodes(d)).toHaveLength(1)
  })
})

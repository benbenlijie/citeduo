/**
 * Reader copy for the policy and error notices, in one place and selected from
 * the browser's language list. Deliberately not an i18n framework: three
 * notices and four error strings do not justify one (issue #11).
 */
export type Language = 'zh' | 'en'

export interface ReaderCopy {
  ar5ivNotice: string
  pdfNotice: string
  abstractNotice: string
  withheldNotice: string
  timeoutError: string
  networkError: string
  noHtmlError: string
}

const ZH: ReaderCopy = {
  ar5ivNotice: 'arXiv 未提供该论文的 HTML 版，当前显示 ar5iv 转换版，排版可能与原文略有差异。',
  pdfNotice: '该论文没有可用的 HTML 版，当前文本由 PDF 自动抽取，公式、图表和版式可能缺失。',
  abstractNotice: '该论文的全文无法获取，当前仅显示摘要。',
  withheldNotice:
    '这个实例对他人开放，按 arXiv 的使用条款不缓存也不对外提供论文全文，因此这里只显示摘要与元数据。阅读原文请点右上角的 arXiv 链接。',
  timeoutError: '网络请求超时，arXiv 或服务器响应过慢。',
  networkError: '网络受限，无法访问 arXiv 或本地服务。',
  noHtmlError: '该论文没有可用的 HTML 版，服务端也未能抽取到全文。',
}

const EN: ReaderCopy = {
  ar5ivNotice:
    'arXiv has no HTML version of this paper, so the ar5iv conversion is shown; the layout may differ slightly from the original.',
  pdfNotice:
    'This paper has no HTML version, so the text was extracted from the PDF; formulas, figures and layout may be missing.',
  abstractNotice: 'The full text of this paper is unavailable; only the abstract is shown.',
  withheldNotice:
    "This instance is reachable by others and, under arXiv's terms of use, does not cache or serve third-party full text; only the abstract and metadata are shown. Use the arXiv link at the top right to read the original.",
  timeoutError: 'The request timed out: arXiv or the local server took too long to answer.',
  networkError: 'The network is restricted: arXiv or the local server could not be reached.',
  noHtmlError: 'This paper has no HTML version, and the server could not extract the full text either.',
}

/**
 * Pick the copy table from a language preference list (`navigator.languages`,
 * most-preferred first). Only Chinese and English exist, so any `zh-*` wins if
 * it appears, and English is the fallback for every other language.
 */
export function pickLanguage(languages?: readonly string[]): Language {
  const list =
    languages ??
    (typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]))
  for (const lang of list) {
    if (typeof lang === 'string' && lang.toLowerCase().startsWith('zh')) return 'zh'
  }
  return 'en'
}

export function readerCopy(languages?: readonly string[]): ReaderCopy {
  return pickLanguage(languages) === 'zh' ? ZH : EN
}

import { describe, expect, it } from 'vitest'
import { pickLanguage, readerCopy } from './copy'

describe('reader copy language selection', () => {
  it('uses Chinese when the preference list contains zh', () => {
    expect(pickLanguage(['zh-CN'])).toBe('zh')
    expect(pickLanguage(['zh-TW', 'en-US'])).toBe('zh')
    expect(pickLanguage(['fr-FR', 'zh'])).toBe('zh')
  })

  it('falls back to English for every other language', () => {
    expect(pickLanguage(['en-US'])).toBe('en')
    expect(pickLanguage(['de-DE', 'ja-JP'])).toBe('en')
    expect(pickLanguage([])).toBe('en')
  })

  it('returns the table for the selected language', () => {
    expect(readerCopy(['zh-CN']).abstractNotice).toMatch(/摘要/)
    expect(readerCopy(['en-US']).abstractNotice).toMatch(/abstract/i)
  })

  it('translates every notice rather than leaving one Chinese-only', () => {
    const zh = readerCopy(['zh-CN'])
    const en = readerCopy(['en-US'])
    for (const key of Object.keys(zh) as Array<keyof typeof zh>) {
      expect(zh[key]).not.toBe(en[key])
      expect(en[key]).not.toMatch(/[\u4e00-\u9fff]/)
    }
  })
})

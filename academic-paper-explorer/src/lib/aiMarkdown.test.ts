import { describe, it, expect } from 'vitest'
import { normalizeAiMarkdown } from './aiMarkdown'

describe('normalizeAiMarkdown', () => {
  it('translates \\(…\\) and \\[…\\] delimiters to dollar math', () => {
    expect(normalizeAiMarkdown('即 \\(x^2 + y^2\\) 与 \\[E = mc^2\\]')).toBe(
      '即 $x^2 + y^2$ 与 \n$$\nE = mc^2\n$$\n',
    )
  })

  it('promotes same-line display math to its own block', () => {
    expect(normalizeAiMarkdown('公式 $$x^2$$ 结束')).toBe('公式 \n$$\nx^2\n$$\n 结束')
  })

  it('trims spaces just inside bold markers left by the model', () => {
    expect(normalizeAiMarkdown('**1. 只说到类别层面 **')).toBe('**1. 只说到类别层面**')
    expect(normalizeAiMarkdown('** 2. 抽象例子** 和 **3. 数学形式 **')).toBe(
      '**2. 抽象例子** 和 **3. 数学形式**',
    )
  })

  it('leaves fenced code, inline code, and LaTeX line spacing alone', () => {
    const source = [
      'use `\\(not math\\)` here',
      '```tex',
      '\\[also not math\\]',
      '```',
      '$$',
      '\\begin{aligned} a &= b \\\\[2pt] c &= d \\end{aligned}',
      '$$',
    ].join('\n')
    expect(normalizeAiMarkdown(source)).toBe(source)
  })
})

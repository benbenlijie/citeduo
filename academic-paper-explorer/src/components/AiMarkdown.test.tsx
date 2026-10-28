import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import AiMarkdown from './AiMarkdown'

describe('AiMarkdown', () => {
  it('renders GFM headings, emphasis, quotes, lists, and tables', () => {
    const { container } = render(
      <AiMarkdown
        text={[
          '## 结论',
          '',
          '这是**重点**，也有*斜体*。',
          '',
          '> 论文里的一句话',
          '',
          '- 第一项',
          '- 第二项',
          '',
          '| 数据集 | 坐标系 |',
          '| --- | --- |',
          '| ALOHA | +x |',
        ].join('\n')}
      />,
    )

    expect(container.querySelector('h2')?.textContent).toBe('结论')
    expect(container.querySelector('strong')?.textContent).toBe('重点')
    expect(container.querySelector('em')?.textContent).toBe('斜体')
    expect(container.querySelector('blockquote')?.textContent).toContain('论文里的一句话')
    expect(container.querySelectorAll('li')).toHaveLength(2)
    expect(container.querySelector('.ai-table-wrap table')).toBeTruthy()
  })

  it('renders inline and display LaTeX with KaTeX', () => {
    const { container } = render(
      <AiMarkdown text={'对齐公式为 $A_d = R_s A_s$。\n\n$$\\sum_{i=1}^n x_i$$'} />,
    )

    expect(container.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(2)
    expect(container.querySelector('.katex-display')).toBeTruthy()
  })

  it('renders partial streaming text without crashing', () => {
    const full = '## 结论\n\n论文**没有**点名数据集。\n\n$A_d = R_s A_s$\n\n$$\\sum_{i=1}^n x_i$$'
    for (let cut = 1; cut <= full.length; cut += 7) {
      const { unmount } = render(<AiMarkdown text={full.slice(0, cut)} />)
      unmount()
    }
  })

  it('does not render raw HTML from the model', () => {
    const { container } = render(
      <AiMarkdown text={'<img src="x" onerror="alert(1)">\n\n<script>alert(2)</script>'} />,
    )

    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('script')).toBeNull()
  })
})

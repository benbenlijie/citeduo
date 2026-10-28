/** Replace a delimiter only when it is not itself escaped (`\\[2pt]`). */
function replaceUnescaped(source: string, pattern: RegExp, replacement: string): string {
  return source.replace(pattern, (match: string, offset: number, whole: string) =>
    offset > 0 && whole[offset - 1] === '\\' ? match : replacement,
  )
}

/**
 * The tutor answers in Markdown and occasionally wraps display math in the
 * LaTeX `\[…\]` / `\(…\)` delimiters instead of `$$…$$` / `$…$`. KaTeX only
 * understands the dollar forms, so translate the backslash forms first.
 * Fenced and inline code is left untouched, and `\\[2pt]`-style line spacing
 * (the `\[` is preceded by a backslash) is not mistaken for display math.
 *
 * A same-line `$$…$$` is also promoted to a block: remark-math otherwise
 * parses it as *inline* math with a doubled delimiter, which renders formulas
 * cramped inside a paragraph instead of centered on their own line.
 *
 * Models often leave a space just inside bold markers (`**1. … **`), which
 * CommonMark cannot parse as strong emphasis. Trim it so those lines render
 * as bold instead of leaking literal asterisks into the transcript.
 */
export function normalizeAiMarkdown(source: string): string {
  return source
    .split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g)
    .map((part, index) => {
      // Odd indices are the captured code segments.
      if (index % 2 === 1) return part
      let text = replaceUnescaped(part, /\\\[/g, '\n$$\n')
      text = replaceUnescaped(text, /\\\]/g, '\n$$\n')
      text = replaceUnescaped(text, /\\\(/g, '$')
      text = replaceUnescaped(text, /\\\)/g, '$')
      return text
        .replace(/\$\$([^\n$]+?)\$\$/g, (_match, body: string) => `\n$$\n${body.trim()}\n$$\n`)
        .replace(/\*\*([^*\n]+?)\*\*/g, (_match, body: string) => `**${body.trim()}**`)
    })
    .join('')
}

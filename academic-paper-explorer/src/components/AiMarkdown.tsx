import { memo, useMemo, type ComponentProps } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import 'katex/dist/katex.min.css'
import { normalizeAiMarkdown } from '../lib/aiMarkdown'

const remarkPlugins = [remarkGfm, remarkMath, remarkBreaks]

const rehypePlugins: NonNullable<ComponentProps<typeof ReactMarkdown>['rehypePlugins']> = [
  [
    rehypeKatex,
    {
      // Never let one malformed formula take down the whole transcript while
      // the answer is still streaming; render the offending source instead.
      throwOnError: false,
      strict: false,
      trust: false,
      errorColor: '#f87171',
    },
  ],
]

const components: Components = {
  a({ node: _node, ...props }) {
    return <a {...props} target="_blank" rel="noopener noreferrer" />
  },
  table({ node: _node, ...props }) {
    return (
      <div className="ai-table-wrap">
        <table {...props} />
      </div>
    )
  },
}

interface Props {
  text: string
}

/**
 * Renders an assistant message as Markdown (GFM) with inline/display LaTeX.
 * Raw HTML is skipped: the model output and retrieved paper text are untrusted.
 */
const AiMarkdown = memo(function AiMarkdown({ text }: Props) {
  const source = useMemo(() => normalizeAiMarkdown(text), [text])
  return (
    <div className="ai-markdown">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={components}
        skipHtml
      >
        {source}
      </ReactMarkdown>
    </div>
  )
})

export default AiMarkdown

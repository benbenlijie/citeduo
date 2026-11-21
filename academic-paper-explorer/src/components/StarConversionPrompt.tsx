import React, { useEffect, useState } from 'react'
import { Star, X } from 'lucide-react'
import { githubStarUrl, hasDiscoverySuccess, recordStarClick, trackConversionEvent } from '../lib/conversion'

const DISMISS_KEY = 'citeduo:star-prompt-dismissed'

function isDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

function saveDismissed(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    // ignore storage errors
  }
}

export const HeaderStarLink: React.FC = () => {
  return (
    <a
      href={githubStarUrl('app_header')}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => recordStarClick('app_header')}
      className="inline-flex min-h-11 items-center gap-1.5 rounded border border-gray-600 bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-gray-200 transition-colors hover:border-amber-400/70 hover:text-amber-200"
      title="在 GitHub 查看源码并点亮 Star（MIT 开源）"
    >
      <Star className="h-3.5 w-3.5 text-amber-400" />
      <span>GitHub Star</span>
    </a>
  )
}

export const ValueStarPrompt: React.FC<{
  visible: boolean
  discoveredNewPaper: boolean
  placement?: string
}> = ({ visible, discoveredNewPaper, placement = 'connection_panel' }) => {
  const [dismissed, setDismissed] = useState<boolean>(() => (typeof window !== 'undefined' ? isDismissed() : false))

  useEffect(() => {
    if (!visible || dismissed) return
    trackConversionEvent('star_cta_view', {
      meta: { placement, valueVerified: discoveredNewPaper || hasDiscoverySuccess() },
    })
  }, [visible, dismissed, placement, discoveredNewPaper])

  if (!visible || dismissed) return null

  return (
    <div
      role="region"
      aria-label="开源支持提示"
      className="rounded border border-emerald-600/40 bg-emerald-950/35 px-2.5 py-2 text-[11px] leading-relaxed text-gray-200"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-gray-200">
          {discoveredNewPaper
            ? '你刚刚通过关联路径打开了一篇新论文。如果 CiteDuo 帮你省下了文献调研时间，欢迎在 GitHub 点一颗 Star 支持开源维护。'
            : '已为你找到可解释的论文关联路径。觉得顺手的话，欢迎在 GitHub 点亮 Star 支持这个 MIT 开源项目。'}
        </p>
        <button
          type="button"
          aria-label="不再显示 Star 提示"
          onClick={() => {
            saveDismissed()
            setDismissed(true)
          }}
          className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-700 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <a
          href={githubStarUrl(placement)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => recordStarClick(placement)}
          className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500"
        >
          <Star className="h-3 w-3" />
          <span>在 GitHub 上 Star</span>
        </a>
        <span className="text-[10px] text-gray-400">MIT 开源 · 不强制登录</span>
      </div>
    </div>
  )
}

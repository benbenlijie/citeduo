import React, { useEffect } from 'react'
import { Pause, Play } from 'lucide-react'
import { useUiStore } from '../../store/useUiStore'
import { EDGE_COLORS } from '../../graph/encoding'

interface Props {
  minYear: number
  maxYear: number
  /** Root paper year; splits the track into 前置 (earlier) and 后续 (later). */
  rootYear?: number | null
}

const GraphTimeline: React.FC<Props> = ({ minYear, maxYear, rootYear }) => {
  const { timelineYear, timelinePlaying, setTimelineYear, setTimelinePlaying } = useUiStore()
  const active = timelineYear != null
  const value = timelineYear ?? maxYear

  const span = maxYear - minYear
  const hasRoot = typeof rootYear === 'number' && rootYear >= minYear && rootYear <= maxYear
  const rootPct = hasRoot ? (span > 0 ? ((rootYear - minYear) / span) * 100 : 50) : 0

  useEffect(() => {
    if (!timelinePlaying) return
    const id = setInterval(() => {
      const current = useUiStore.getState().timelineYear ?? maxYear
      if (current >= maxYear) {
        setTimelinePlaying(false)
        return
      }
      setTimelineYear(Math.min(maxYear, current + 1))
    }, 700)
    return () => clearInterval(id)
  }, [timelinePlaying, maxYear, setTimelineYear, setTimelinePlaying])

  const togglePlay = () => {
    if (timelinePlaying) {
      setTimelinePlaying(false)
      return
    }
    // Start from the earliest year when idle so playback has somewhere to go.
    if (timelineYear == null || timelineYear >= maxYear) setTimelineYear(minYear)
    setTimelinePlaying(true)
  }

  return (
    <div className="absolute bottom-2 left-2 right-2 z-10 rounded-lg bg-gray-800/90 px-3 py-2 text-xs text-white sm:bottom-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:px-4">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="font-medium text-gray-300">时间轴</span>
        <span className="rounded bg-gray-700 px-2 py-0.5 tabular-nums" title="当前筛选到的年份">
          {active ? `≤ ${value} 年` : '全部年份'}
        </span>
        <button
          type="button"
          aria-label={timelinePlaying ? '暂停' : '播放'}
          onClick={togglePlay}
          title={timelinePlaying ? '暂停播放' : '逐年播放'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded hover:bg-gray-700"
        >
          {timelinePlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => {
            setTimelinePlaying(false)
            setTimelineYear(null)
          }}
          disabled={!active}
          className="min-h-11 rounded px-3 py-2 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          title="显示全部年份"
        >
          全部
        </button>
      </div>
      {hasRoot && span > 0 && (
        <div className="mb-1" title={`以根论文 ${rootYear} 年为界`}>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-gray-700">
            <div
              className="absolute inset-y-0 left-0"
              style={{ width: `${rootPct}%`, background: EDGE_COLORS.reference, opacity: 0.55 }}
            />
            <div
              className="absolute inset-y-0 right-0"
              style={{ width: `${100 - rootPct}%`, background: EDGE_COLORS.citation, opacity: 0.55 }}
            />
            <div
              className="absolute inset-y-0 w-0.5 bg-white"
              style={{ left: `calc(${rootPct}% - 1px)` }}
            />
          </div>
          <div className="mt-0.5 flex justify-between text-[10px] text-gray-400">
            <span className="text-blue-300">前置 ≤ {rootYear}</span>
            <span className="text-green-300">后续 &gt; {rootYear}</span>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="w-8 text-right text-[10px] tabular-nums text-gray-400">{minYear}</span>
        <input
          type="range"
          aria-label="时间轴年份"
          min={minYear}
          max={maxYear}
          value={value}
          onChange={(e) => {
            setTimelinePlaying(false)
            setTimelineYear(parseInt(e.target.value))
          }}
          className="h-11 w-56 cursor-pointer"
        />
        <span className="w-8 text-[10px] tabular-nums text-gray-400">{maxYear}</span>
      </div>
      <div className="mt-0.5 text-center text-[10px] text-gray-500">
        拖动或播放：仅显示该年份及更早发表的论文
      </div>
    </div>
  )
}

export default GraphTimeline

import { useCallback, useEffect, useRef, useState } from 'react'
import type { EdgeType } from '../types/domain'
import { EDGE_TYPE_FOCUS_DELAY_MS } from '../graph/edgeTypeFocus'

/**
 * Hover-intent for the legend's edge-type entries. The preview only engages
 * after the pointer has rested for `delay`, and leaving the entry clears it
 * immediately so the graph snaps back without waiting for another timeout.
 */
export function useEdgeTypeFocus(delay = EDGE_TYPE_FOCUS_DELAY_MS) {
  const [activeType, setActiveType] = useState<EdgeType | null>(null)
  const pendingType = useRef<EdgeType | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const clearPending = useCallback(() => {
    pendingType.current = null
    clearTimer()
  }, [clearTimer])

  const clearFocus = useCallback(() => {
    clearPending()
    setActiveType(null)
  }, [clearPending])

  const hoverEdgeType = useCallback(
    (type: EdgeType | null) => {
      if (type === null) {
        clearFocus()
        return
      }
      // Re-entering the same entry keeps the current preview running instead of
      // restarting its dwell.
      if (pendingType.current === type) return
      clearTimer()
      pendingType.current = type
      // Moving directly to another entry drops the previous preview at once.
      setActiveType(null)
      timer.current = setTimeout(() => {
        timer.current = null
        if (pendingType.current === type) setActiveType(type)
      }, delay)
    },
    [clearFocus, clearTimer, delay],
  )

  useEffect(() => clearPending, [clearPending])

  return { activeType, hoverEdgeType, clearFocus }
}

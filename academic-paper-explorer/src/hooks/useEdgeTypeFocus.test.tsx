import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useEdgeTypeFocus } from './useEdgeTypeFocus'

describe('useEdgeTypeFocus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('waits for the dwell before previewing the hovered type', () => {
    const { result } = renderHook(() => useEdgeTypeFocus(1000))
    act(() => result.current.hoverEdgeType('reference'))

    act(() => {
      vi.advanceTimersByTime(999)
    })
    expect(result.current.activeType).toBeNull()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.activeType).toBe('reference')
  })

  it('clears the preview as soon as the pointer leaves', () => {
    const { result } = renderHook(() => useEdgeTypeFocus(1000))
    act(() => result.current.hoverEdgeType('reference'))
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.activeType).toBe('reference')

    act(() => result.current.hoverEdgeType(null))
    expect(result.current.activeType).toBeNull()
  })

  it('cancels a pending preview when the pointer leaves early', () => {
    const { result } = renderHook(() => useEdgeTypeFocus(1000))
    act(() => result.current.hoverEdgeType('reference'))
    act(() => {
      vi.advanceTimersByTime(400)
    })
    act(() => result.current.hoverEdgeType(null))
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.activeType).toBeNull()
  })

  it('restarts the dwell when the pointer moves to another type', () => {
    const { result } = renderHook(() => useEdgeTypeFocus(1000))
    act(() => result.current.hoverEdgeType('reference'))
    act(() => {
      vi.advanceTimersByTime(600)
    })
    act(() => result.current.hoverEdgeType('semantic'))

    act(() => {
      vi.advanceTimersByTime(999)
    })
    expect(result.current.activeType).toBeNull()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.activeType).toBe('semantic')
  })
})

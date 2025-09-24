import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useZoomAndPan } from '../hooks/useZoomAndPan'

describe('useZoomAndPan Hook', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useZoomAndPan())
    
    expect(result.current.scale).toBe(1)
    expect(result.current.translate).toEqual({ x: 0, y: 0 })
    expect(result.current.panning).toBe(false)
    expect(result.current.imgSize).toBeNull()
  })

  it('should update scale value', () => {
    const { result } = renderHook(() => useZoomAndPan())
    
    act(() => {
      result.current.setScale(1.5)
    })
    
    expect(result.current.scale).toBe(1.5)
  })

  it('should update translate values', () => {
    const { result } = renderHook(() => useZoomAndPan())
    
    act(() => {
      result.current.setTranslate({ x: 100, y: 200 })
    })
    
    expect(result.current.translate).toEqual({ x: 100, y: 200 })
  })

  it('should update image size', () => {
    const { result } = renderHook(() => useZoomAndPan())
    
    act(() => {
      result.current.setImgSize({ w: 800, h: 600 })
    })
    
    expect(result.current.imgSize).toEqual({ w: 800, h: 600 })
  })

  it('should handle pointer down event', () => {
    const { result } = renderHook(() => useZoomAndPan())
    
    const mockEvent = {
      clientX: 100,
      clientY: 200,
      preventDefault: () => {}
    } as React.PointerEvent

    act(() => {
      result.current.handlePointerDown(mockEvent)
    })
    
    expect(result.current.panning).toBe(true)
  })

  it('should handle pointer move during panning', () => {
    const { result } = renderHook(() => useZoomAndPan())
    
    // First start panning
    const downEvent = {
      clientX: 100,
      clientY: 200,
      preventDefault: () => {}
    } as React.PointerEvent

    act(() => {
      result.current.handlePointerDown(downEvent)
    })
    
    // Then move
    const moveEvent = {
      clientX: 150,
      clientY: 250
    } as React.PointerEvent

    act(() => {
      result.current.handlePointerMove(moveEvent)
    })
    
    // Should update translate based on movement
    expect(result.current.translate.x).toBe(50) // 150 - 100
    expect(result.current.translate.y).toBe(50) // 250 - 200
  })

  it('should handle pointer up event', () => {
    const { result } = renderHook(() => useZoomAndPan())
    
    // First start panning
    const downEvent = {
      clientX: 100,
      clientY: 200,
      preventDefault: () => {}
    } as React.PointerEvent

    act(() => {
      result.current.handlePointerDown(downEvent)
    })
    
    expect(result.current.panning).toBe(true)
    
    // Then end panning
    act(() => {
      result.current.handlePointerUp()
    })
    
    expect(result.current.panning).toBe(false)
  })

  it('should not move when not panning', () => {
    const { result } = renderHook(() => useZoomAndPan())
    
    const initialTranslate = { ...result.current.translate }
    
    // Move without starting panning first
    const moveEvent = {
      clientX: 150,
      clientY: 250
    } as React.PointerEvent

    act(() => {
      result.current.handlePointerMove(moveEvent)
    })
    
    // Should not have moved
    expect(result.current.translate).toEqual(initialTranslate)
  })

  it('should maintain state consistency during multiple operations', () => {
    const { result } = renderHook(() => useZoomAndPan())
    
    // Set initial image size
    act(() => {
      result.current.setImgSize({ w: 1200, h: 800 })
    })
    
    // Scale up
    act(() => {
      result.current.setScale(2)
    })
    
    // Pan around
    act(() => {
      result.current.setTranslate({ x: 100, y: 100 })
    })
    
    // All values should be maintained
    expect(result.current.imgSize).toEqual({ w: 1200, h: 800 })
    expect(result.current.scale).toBe(2)
    expect(result.current.translate).toEqual({ x: 100, y: 100 })
  })
})
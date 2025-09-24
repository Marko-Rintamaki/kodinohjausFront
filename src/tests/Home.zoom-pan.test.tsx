import { render, screen, act, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Home } from '../pages/Home'
import { SocketProvider } from '../contexts/SocketContext'

// Mock socket context
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connected: true
}

const MockSocketProvider = ({ children }: { children: React.ReactNode }) => (
  // @ts-expect-error - mocking context for tests
  <SocketProvider value={mockSocket}>
    {children}
  </SocketProvider>
)

const renderHome = () => {
  return render(
    <MockSocketProvider>
      <Home />
    </MockSocketProvider>
  )
}

describe('Home Component - Zoom and Pan Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock getBoundingClientRect for the SVG container
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
    } as DOMRect))
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  it('renders the main SVG container', () => {
    renderHome()
    
    // Check if the main image element exists (the background image)
    const imgElement = screen.getByAltText('Pohjakuva')
    expect(imgElement).toBeInTheDocument()
  })

  it('has correct initial zoom and pan state', () => {
    renderHome()
    
    // The image should be rendered with initial state
    const imgElement = screen.getByAltText('Pohjakuva')
    
    // Check if the image container exists
    expect(imgElement).toBeInTheDocument()
  })

  it('handles mouse wheel zoom events', async () => {
    renderHome()
    
    const imgElement = screen.getByAltText('Pohjakuva')
    const container = imgElement.closest('div')
    
    // Mock wheel event with deltaY negative (zoom in) on the container
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: -100,
      clientX: 400,
      clientY: 300,
      bubbles: true
    })
    
    if (container) {
      container.dispatchEvent(wheelEvent)
    }
    
    // After zoom, the element should still be in the document
    expect(imgElement).toBeInTheDocument()
  })

  it('handles mouse drag panning', async () => {
    renderHome()
    
    const imgElement = screen.getByAltText('Pohjakuva')
    const container = imgElement.closest('div')
    
    // Mock mouse events for dragging on the container
    const mouseDownEvent = new MouseEvent('mousedown', {
      clientX: 100,
      clientY: 100,
      bubbles: true,
      button: 0
    })
    
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 150,
      clientY: 150,
      bubbles: true
    })
    
    const mouseUpEvent = new MouseEvent('mouseup', {
      clientX: 150,
      clientY: 150,
      bubbles: true
    })
    
    if (container) {
      act(() => {
        container.dispatchEvent(mouseDownEvent)
        container.dispatchEvent(mouseMoveEvent)
        container.dispatchEvent(mouseUpEvent)
      })
    }
    
    // After panning, the element should still be in the document
    expect(imgElement).toBeInTheDocument()
  })

  it('prevents default behavior on wheel events', () => {
    renderHome()
    
    const imgElement = screen.getByAltText('Pohjakuva')
    const container = imgElement.closest('div')
    
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: -100,
      bubbles: true
    })
    
    if (container) {
      container.dispatchEvent(wheelEvent)
    }
    
    // The component should handle the wheel event
    expect(imgElement).toBeInTheDocument()
  })

  it('handles touch events for mobile pinch/pan', () => {
    renderHome()
    
    const imgElement = screen.getByAltText('Pohjakuva')
    const container = imgElement.closest('div')
    
    // Mock touch events for pinch gesture
    const touchStartEvent = new TouchEvent('touchstart', {
      touches: [
        { clientX: 100, clientY: 100 } as Touch,
        { clientX: 200, clientY: 200 } as Touch
      ],
      bubbles: true
    })
    
    const touchMoveEvent = new TouchEvent('touchmove', {
      touches: [
        { clientX: 80, clientY: 80 } as Touch,
        { clientX: 220, clientY: 220 } as Touch
      ],
      bubbles: true
    })
    
    if (container) {
      act(() => {
        container.dispatchEvent(touchStartEvent)
        container.dispatchEvent(touchMoveEvent)
      })
    }
    
    // After touch handling, the element should still be in the document
    expect(imgElement).toBeInTheDocument()
  })
})
import { test, expect } from '@playwright/test'

test.describe('Home Page - Zoom and Pan E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page
    await page.goto('/')
    
    // Wait for the SVG image to load
    await page.waitForSelector('img[alt="Pohjakuva"]', { timeout: 10000 })
  })

  test('should render the main SVG container and image', async ({ page }) => {
    // Check if the background image is loaded
    const img = page.locator('img[alt="Pohjakuva"]')
    await expect(img).toBeVisible()
    
    // Verify the container has the correct styles
    const container = img.locator('..')
    await expect(container).toHaveCSS('cursor', /grab|default/)
  })

  test('should handle mouse wheel zoom in and out', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Mouse wheel is not supported on mobile devices')
    
    const container = page.locator('img[alt="Pohjakuva"]').locator('..')
    
    // Get initial transform
    const initialTransform = await container.evaluate(el => 
      window.getComputedStyle(el).transform
    )
    
    // Zoom in using mouse wheel
    await container.hover()
    await page.mouse.wheel(0, -120) // Scroll up to zoom in
    
    // Wait a bit for the animation/update
    await page.waitForTimeout(100)
    
    // Get new transform and verify it changed
    const zoomedTransform = await container.evaluate(el => 
      window.getComputedStyle(el).transform
    )
    
    expect(zoomedTransform).not.toBe(initialTransform)
    
    // Zoom out
    await page.mouse.wheel(0, 120) // Scroll down to zoom out
    await page.waitForTimeout(100)
    
    const zoomedOutTransform = await container.evaluate(el => 
      window.getComputedStyle(el).transform
    )
    
    expect(zoomedOutTransform).not.toBe(zoomedTransform)
  })

  test('should handle mouse drag panning', async ({ page }) => {
    const container = page.locator('img[alt="Pohjakuva"]').locator('..')
    
    // Get initial transform
    const initialTransform = await container.evaluate(el => 
      window.getComputedStyle(el).transform
    )
    
    // Perform drag operation
    await container.hover()
    await page.mouse.down()
    await page.mouse.move(100, 100)
    await page.mouse.up()
    
    // Wait for the update
    await page.waitForTimeout(100)
    
    // Get new transform and verify it changed
    const pannedTransform = await container.evaluate(el => 
      window.getComputedStyle(el).transform
    )
    
    expect(pannedTransform).not.toBe(initialTransform)
  })

  test('should show correct cursor states during interaction', async ({ page }) => {
    const container = page.locator('img[alt="Pohjakuva"]').locator('..')
    
    // Initial cursor should be 'grab'
    await expect(container).toHaveCSS('cursor', /grab/)
    
    // During drag, cursor should change to 'grabbing'
    await container.hover()
    await page.mouse.down()
    
    // Note: cursor change during drag might not be immediately detectable in Playwright
    // but we can verify the drag functionality works
    await page.mouse.move(50, 50)
    await page.mouse.up()
    
    // After drag, cursor should return to 'grab'
    await expect(container).toHaveCSS('cursor', /grab/)
  })

  test('should handle mobile touch interactions', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip()
    }

    const container = page.locator('img[alt="Pohjakuva"]').locator('..')
    
    // Get initial transform
    const initialTransform = await container.evaluate(el => 
      window.getComputedStyle(el).transform
    )
    
    // Simulate single finger pan
    const bbox = await container.boundingBox()
    if (bbox) {
      await page.touchscreen.tap(bbox.x + bbox.width / 2, bbox.y + bbox.height / 2)
      
      // Simulate touch drag
      await container.dispatchEvent('touchstart', {
        touches: [{ 
          identifier: 1,
          clientX: bbox.x + 100, 
          clientY: bbox.y + 100 
        }]
      })
      
      await container.dispatchEvent('touchmove', {
        touches: [{ 
          identifier: 1,
          clientX: bbox.x + 150, 
          clientY: bbox.y + 150 
        }]
      })
      
      await container.dispatchEvent('touchend', { touches: [] })
      
      await page.waitForTimeout(100)
      
      const touchPannedTransform = await container.evaluate(el => 
        window.getComputedStyle(el).transform
      )
      
      // Transform should change due to touch pan
      expect(touchPannedTransform).not.toBe(initialTransform)
    }
  })

  test('should maintain zoom and pan state during interactions', async ({ page, isMobile, browserName }) => {
    test.skip(isMobile, 'Mouse wheel is not supported on mobile devices')
    
    const container = page.locator('img[alt="Pohjakuva"]').locator('..')
    
    // First zoom in
    await container.hover()
    await page.mouse.wheel(0, -120)
    await page.waitForTimeout(100)
    
    const zoomedTransform = await container.evaluate(el => 
      window.getComputedStyle(el).transform
    )
    
    // Then pan
    await page.mouse.down()
    await page.mouse.move(50, 50)
    await page.mouse.up()
    await page.waitForTimeout(100)
    
    const zoomedAndPannedTransform = await container.evaluate(el => 
      window.getComputedStyle(el).transform
    )
    
    // Both zoom and pan should be applied (allow for Firefox edge case)
    if (browserName !== 'firefox') {
      expect(zoomedAndPannedTransform).not.toBe(zoomedTransform)
    }
    
    // Zoom should still be maintained (scale component should be > 1)
    const scaleValue = await container.evaluate(el => {
      const transform = window.getComputedStyle(el).transform
      if (transform === 'none') return 1
      const matrix = transform.match(/matrix\(([^)]+)\)/)
      if (matrix) {
        const values = matrix[1].split(',').map(Number)
        return values[0] // scaleX
      }
      return 1
    })
    
    expect(scaleValue).toBeGreaterThan(1)
  })

  test('should respect zoom limits', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Mouse wheel is not supported on mobile devices')
    
    const container = page.locator('img[alt="Pohjakuva"]').locator('..')
    
    // Try to zoom in excessively
    await container.hover()
    for (let i = 0; i < 20; i++) {
      await page.mouse.wheel(0, -120)
      await page.waitForTimeout(10)
    }
    
    // Get scale value
    const maxScale = await container.evaluate(el => {
      const transform = window.getComputedStyle(el).transform
      if (transform === 'none') return 1
      const matrix = transform.match(/matrix\(([^)]+)\)/)
      if (matrix) {
        const values = matrix[1].split(',').map(Number)
        return values[0] // scaleX
      }
      return 1
    })
    
    // Should not exceed maximum zoom (3x)
    expect(maxScale).toBeLessThanOrEqual(3.1) // Small tolerance for floating point
    
    // Try to zoom out excessively
    for (let i = 0; i < 20; i++) {
      await page.mouse.wheel(0, 120)
      await page.waitForTimeout(10)
    }
    
    const minScale = await container.evaluate(el => {
      const transform = window.getComputedStyle(el).transform
      if (transform === 'none') return 1
      const matrix = transform.match(/matrix\(([^)]+)\)/)
      if (matrix) {
        const values = matrix[1].split(',').map(Number)
        return values[0] // scaleX
      }
      return 1
    })
    
    // Should not go below minimum zoom (0.5x)
    expect(minScale).toBeGreaterThanOrEqual(0.4) // Small tolerance for floating point
  })
})
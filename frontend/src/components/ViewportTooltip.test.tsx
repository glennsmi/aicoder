import { render, screen, fireEvent } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import ViewportTooltip from './ViewportTooltip'
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
it('keeps a tall tooltip below the top edge and inside the right edge', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 430, height: 700 } as DOMRect)
  render(<ViewportTooltip x={1000} y={120}>Breakdown</ViewportTooltip>)
  const tooltip = screen.getByRole('tooltip')
  const left = parseFloat(tooltip.style.left), top = parseFloat(tooltip.style.top)
  expect(left).toBeGreaterThanOrEqual(12)
  expect(left + 430).toBeLessThanOrEqual(window.innerWidth - 12)
  expect(top).toBeGreaterThanOrEqual(12)
  expect(top + 700).toBeLessThanOrEqual(window.innerHeight - 12)
})
it('limits size to the viewport and recalculates after resize', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 250, height: 200 } as DOMRect)
  render(<ViewportTooltip x={0} y={0}>Breakdown</ViewportTooltip>)
  vi.stubGlobal('innerWidth', 320); vi.stubGlobal('innerHeight', 240)
  fireEvent(window, new Event('resize'))
  const tooltip = screen.getByRole('tooltip')
  expect(tooltip.style.maxHeight).toBe('216px')
  expect(tooltip.style.maxWidth).toBe('296px')
  expect(tooltip.style.left).toBe('12px')
  expect(tooltip).toHaveClass('overflow-y-auto')
})

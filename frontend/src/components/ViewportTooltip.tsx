import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/** Measure the rendered content; estimates cannot account for wrapped model names. */
export default function ViewportTooltip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: 12, top: 12 })
  useLayoutEffect(() => {
    const update = () => {
      const el = ref.current
      if (!el) return
      const viewport = window.visualViewport
      const leftEdge = (viewport?.offsetLeft ?? 0) + 12
      const topEdge = (viewport?.offsetTop ?? 0) + 12
      const width = (viewport?.width ?? window.innerWidth) - 24
      const height = (viewport?.height ?? window.innerHeight) - 24
      el.style.maxWidth = `${Math.max(1, width)}px`
      el.style.maxHeight = `${Math.max(1, height)}px`
      const box = el.getBoundingClientRect()
      const preferredTop = y - box.height - 18 >= topEdge ? y - box.height - 18 : y + 18
      const next = {
        left: Math.max(leftEdge, Math.min(x - box.width / 2, leftEdge + width - box.width)),
        top: Math.max(topEdge, Math.min(preferredTop, topEdge + height - box.height)),
      }
      setPosition(old => old.left === next.left && old.top === next.top ? old : next)
    }
    update()
    const observer = new ResizeObserver(update)
    if (ref.current) observer.observe(ref.current)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
    }
  }, [x, y])
  return <div ref={ref} role="tooltip" className="rounded-lg shadow-xl w-[430px] border border-gray-200 overflow-y-auto overscroll-contain break-words"
    style={{ position: 'fixed', ...position, maxWidth: 'calc(100vw - 24px)', maxHeight: 'calc(100dvh - 24px)', zIndex: 2147483647, pointerEvents: 'auto' }}>
    {children}
  </div>
}

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  resolveMenuViewportLayout,
  resolveSubmenuViewportLayout,
  submenuKeyAction,
  submenuTriggerKeyAction,
  wrappedMenuIndex
} from './menuGeometry'

describe('File menu viewport sizing', () => {
  it('shows a fitting menu without a scrollbar and preserves the bottom margin', () => {
    expect(resolveMenuViewportLayout(34, 420, 600)).toEqual({ maxHeight: 556, scroll: false })
  })

  it('enables scrolling only when the available height is too short', () => {
    expect(resolveMenuViewportLayout(34, 420, 400)).toEqual({ maxHeight: 356, scroll: true })
  })
})

describe('Open Recent cascading placement', () => {
  const parentRect = { top: 80, left: 100, right: 324 }

  it('opens to the right when space is available', () => {
    expect(resolveSubmenuViewportLayout(parentRect, 192, 240, 900, 700)).toMatchObject({
      left: 328,
      side: 'right',
      scroll: false
    })
  })

  it('flips to the left when right-side space is insufficient', () => {
    expect(resolveSubmenuViewportLayout(parentRect, 192, 240, 500, 700)).toMatchObject({
      left: 10,
      side: 'left'
    })
  })

  it('clamps to the safe bottom and top viewport margins', () => {
    expect(resolveSubmenuViewportLayout({ ...parentRect, top: 590 }, 192, 240, 900, 700).top).toBe(450)
    expect(resolveSubmenuViewportLayout({ ...parentRect, top: -5 }, 192, 240, 900, 700).top).toBe(10)
  })

  it('fits five recents, a separator, and Clear Recent without scrolling normally', () => {
    expect(resolveSubmenuViewportLayout(parentRect, 240, 252, 900, 700).scroll).toBe(false)
  })

  it('scrolls only when the complete submenu cannot fit in the viewport', () => {
    expect(resolveSubmenuViewportLayout(parentRect, 240, 252, 900, 240)).toMatchObject({
      maxHeight: 220,
      scroll: true
    })
  })
})

describe('Open Recent keyboard navigation', () => {
  it('maps conventional trigger and submenu keys', () => {
    expect(submenuTriggerKeyAction('ArrowRight')).toBe('open-first')
    expect(submenuTriggerKeyAction('Enter')).toBe('open')
    expect(submenuTriggerKeyAction(' ')).toBe('open')
    expect(submenuKeyAction('ArrowDown')).toBe('next')
    expect(submenuKeyAction('ArrowUp')).toBe('previous')
    expect(submenuKeyAction('ArrowLeft')).toBe('return')
    expect(submenuKeyAction('Escape')).toBe('close')
  })

  it('wraps enabled submenu focus in both directions', () => {
    expect(wrappedMenuIndex(2, 3, 1)).toBe(0)
    expect(wrappedMenuIndex(0, 3, -1)).toBe(2)
  })
})

describe('Open Recent renderer integration', () => {
  const menuSource = readFileSync(new URL('../components/AppMenuBar.tsx', import.meta.url), 'utf8')
  const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')

  it('portals the submenu outside the clipping File menu list', () => {
    expect(menuSource).toContain('createPortal(submenuList, document.body)')
    expect(menuSource).toContain('data-app-menu-overlay="true"')
    expect(styles).toMatch(/\.app-menu__sublist\s*\{[^}]*position:\s*fixed;[^}]*z-index:\s*1000;/s)
  })

  it('bridges the pointer gap briefly and preserves existing activation callbacks', () => {
    expect(menuSource).toContain('window.setTimeout(() => closeSubmenu(), 140)')
    expect(menuSource).toContain('onPointerEnter={cancelClose}')
    expect(menuSource).toContain('if (!item.disabled) item.action()')
    expect(menuSource).toContain("action: () => runOpenRecentTarget(target)")
    expect(menuSource).toContain('action: () => { void clearRecent() }')
  })
})
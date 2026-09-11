/**
 * VEIL design token values — keep in sync with `--veil-*` in styles.css and docs/design/TOKENS.md.
 * @see docs/design/COLOR_SYSTEM.md
 */
export const VEIL_BRAND = '#6D5CE7'
export const VEIL_BRAND_HOVER = '#7E70EB'
export const VEIL_BRAND_PRESSED = '#5846D6'

export const VEIL_MASK = '#7C6EE6'
export const VEIL_MUTE = '#E8A23A'
export const VEIL_SKIP = '#79B54A'
export const VEIL_BOOKMARK = '#4FA4E8'

export const VEIL_WARNING = '#E0A83A'
export const VEIL_DANGER = '#D95C5C'

export const VEIL_ACTION_COLORS = {
  mask: VEIL_MASK,
  mute: VEIL_MUTE,
  skip: VEIL_SKIP
} as const

export type VeilActionKind = keyof typeof VEIL_ACTION_COLORS

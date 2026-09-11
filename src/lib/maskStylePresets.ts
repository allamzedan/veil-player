import type { MaskPresentation, MaskStyle } from '../types/track'

export interface MaskStylePreset {
  id: string
  label: string
  style: Pick<MaskStyle, 'color' | 'opacity' | 'presentation'>
}

export const MASK_STYLE_PRESETS: MaskStylePreset[] = [
  {
    id: 'black',
    label: 'Black',
    style: { color: '#000000', opacity: 1, presentation: 'solid' }
  },
  {
    id: 'dark-gray',
    label: 'Dark gray',
    style: { color: '#1a1a1a', opacity: 0.95, presentation: 'dim' }
  },
  {
    id: 'semi',
    label: 'Semi',
    style: { color: '#000000', opacity: 0.65, presentation: 'dim' }
  },
  {
    id: 'soft-glass',
    label: 'Soft glass',
    style: { color: '#0a0a0a', opacity: 0.72, presentation: 'softGlass' }
  }
]

export const ADVANCED_MASK_PRESENTATIONS: { id: MaskPresentation; label: string }[] = [
  { id: 'blur', label: 'Blur' },
  { id: 'frosted', label: 'Frosted' },
  { id: 'softEdge', label: 'Soft edge' },
  { id: 'lowContrast', label: 'Low contrast' }
]

export function resolveMaskPresentation(style: MaskStyle): MaskPresentation {
  return style.presentation ?? 'solid'
}

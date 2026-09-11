import { t } from '../i18n'
import { formatSeconds } from '../lib/time'
import type { SelectableItemType } from '../lib/trackItems'
import { BookmarkIcon, MaskIcon, MuteIcon, SkipIcon } from './icons'

export interface LayerSelectionPreviewData {
  id: string
  type: SelectableItemType
  label: string
  start: number
  end: number
  notes?: string
  enabled?: boolean
  active?: boolean
}

interface LayerSelectionPreviewProps {
  item: LayerSelectionPreviewData
  className?: string
}

function typeIcon(type: SelectableItemType) {
  if (type === 'mask') return <MaskIcon />
  if (type === 'mute') return <MuteIcon />
  if (type === 'skip') return <SkipIcon />
  return <BookmarkIcon />
}

function typeLabel(type: SelectableItemType): string {
  if (type === 'mask') return t('timeline.mask')
  if (type === 'mute') return t('timeline.mute')
  if (type === 'skip') return t('timeline.skip')
  return t('bookmarks.defaultLabel')
}

export default function LayerSelectionPreview({ item, className = '' }: LayerSelectionPreviewProps) {
  const range = item.type !== 'bookmark'
  const note = item.notes?.trim()
  return (
    <section
      className={`layer-selection-preview selected-layer-panel-region selected-layer-panel-region--preview${className ? ` ${className}` : ''}`}
      aria-label="Selected Layer"
    >
      <div className={`layer-selection-preview__type layer-selection-preview__type--${item.type}`}>
        <span aria-hidden="true">{typeIcon(item.type)}</span>
        <strong>{typeLabel(item.type)}</strong>
      </div>
      <span className="layer-selection-preview__timing ltr-digits" dir="ltr">
        {formatSeconds(item.start)}{range ? `–${formatSeconds(item.end)}` : ''}
      </span>
      <strong className="layer-selection-preview__label" dir="auto" title={item.label}>{item.label}</strong>
      {range ? (
        <span className="layer-selection-preview__meta">
          <span className="ltr-digits" dir="ltr">{formatSeconds(Math.max(0, item.end - item.start))}</span>
          {' · '}{item.enabled === false ? t('layers.disabled') : t('inspector.enabled')}
          {item.active ? ` · ${t('layers.active')}` : ''}
        </span>
      ) : note ? (
        <span className="layer-selection-preview__note" dir="auto" title={note}>{note}</span>
      ) : null}
    </section>
  )
}

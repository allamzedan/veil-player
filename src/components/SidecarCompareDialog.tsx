import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import { CheckIcon, UploadFileIcon } from './icons'
import type { VeilTrackStorePayload } from '../lib/trackSerialization'
import {
  compareSidecarItems,
  formatSidecarItem,
  selectedSidecarPayload,
  type SidecarComparison,
  type SidecarComparisonItem
} from '../lib/sidecarCompare'

interface SidecarCompareDialogProps {
  open: boolean
  current: VeilTrackStorePayload | null
  imported: VeilTrackStorePayload | null
  mediaWarning: string | null
  onCancel: () => void
  onApply: (payload: Pick<VeilTrackStorePayload, 'masks' | 'mutes' | 'skips' | 'bookmarks'>) => void
}

const labels = { mask: 'Mask', mute: 'Mute', skip: 'Skip', bookmark: 'Bookmark' } as const
type Filter = 'all' | 'new' | 'duplicate' | 'conflict'

function itemCount(payload: VeilTrackStorePayload): number {
  return payload.masks.length + payload.mutes.length + payload.skips.length + payload.bookmarks.length
}

function statusLabel(status: SidecarComparisonItem['status']): string {
  return status === 'new' ? 'New' : status === 'duplicate' ? 'Already present' : 'Needs attention'
}

function conflictExplanation(entry: SidecarComparisonItem): string | null {
  if (entry.status !== 'conflict') return null
  const type = entry.relatedCurrentItem?.type ?? entry.item.type
  return `Overlaps an existing ${labels[type]}.`
}

export default function SidecarCompareDialog({
  open,
  current,
  imported,
  mediaWarning,
  onCancel,
  onApply
}: SidecarCompareDialogProps) {
  const comparison: SidecarComparison | null = useMemo(
    () => (current && imported ? compareSidecarItems(current, imported) : null),
    [current, imported]
  )
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    setSelectedIds(comparison
      ? new Set(comparison.items.filter((entry) => entry.status === 'new').map((entry) => entry.item.id))
      : new Set())
    setFilter('all')
  }, [comparison])

  if (!comparison || !current || !imported) return null

  const selectable = comparison.items.filter((entry) => entry.status !== 'duplicate')
  const importableDifferences = selectable.length > 0
  const selectedCount = selectedIds.size
  const summary = {
    current: itemCount(current),
    imported: itemCount(imported),
    newItems: comparison.items.filter((entry) => entry.status === 'new').length,
    duplicates: comparison.items.filter((entry) => entry.status === 'duplicate').length,
    conflicts: comparison.items.filter((entry) => entry.status === 'conflict').length
  }
  const toggle = (id: string): void => {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const toggleNew = (checked: boolean): void => {
    setSelectedIds(checked
      ? new Set(comparison.items.filter((entry) => entry.status === 'new').map((entry) => entry.item.id))
      : new Set())
  }
  const visibleItems = filter === 'all'
    ? comparison.items
    : comparison.items.filter((entry) => entry.status === filter)
  const groups = (['mask', 'mute', 'skip', 'bookmark'] as const).map((type) => ({
    type,
    entries: visibleItems.filter((entry) => entry.item.type === type)
  })).filter((group) => group.entries.length > 0)

  const footer = (
    <div className="sidecar-compare-dialog__footer">
      <span className="sidecar-compare-dialog__selected-count">{selectedCount} items selected for import</span>
      <div className="sidecar-compare-dialog__footer-actions">
        <button type="button" className="btn btn-ghost btn-compact" onClick={onCancel}>Cancel</button>
        <button
          type="button"
          className="btn btn-primary btn-compact"
          disabled={selectedCount === 0}
          onClick={() => onApply(selectedSidecarPayload(comparison, selectedIds))}
        >
          Import selected ({selectedCount})
        </button>
      </div>
    </div>
  )

  return (
    <Modal
      open={open}
      title="Compare / Import VEIL"
      titleContent={(
        <span className="sidecar-compare-dialog__header">
          <UploadFileIcon size={22} className="sidecar-compare-dialog__title-icon" />
          <span className="sidecar-compare-dialog__header-copy">
            <span>Compare / Import VEIL</span>
            <small>The imported VEIL will be compared and selected items can be added without replacing the current VEIL.</small>
          </span>
        </span>
      )}
      onClose={onCancel}
      panelClassName="sidecar-compare-dialog__panel"
      footer={importableDifferences ? footer : (
        <div className="sidecar-compare-dialog__footer">
          <span />
          <button type="button" className="btn btn-ghost btn-compact" onClick={onCancel}>Close</button>
        </div>
      )}
    >
      <div className="sidecar-compare-dialog">
        <div className="sidecar-compare-dialog__summary" aria-label="Comparison summary">
          <span><span>Current</span><strong>{summary.current}</strong></span>
          <span><span>Imported</span><strong>{summary.imported}</strong></span>
          <span className="sidecar-compare-dialog__summary--new"><span>New</span><strong>{summary.newItems}</strong></span>
          <span><span>Already present</span><strong>{summary.duplicates}</strong></span>
          <span className="sidecar-compare-dialog__summary--attention"><span>Needs attention</span><strong>{summary.conflicts}</strong></span>
        </div>
        {mediaWarning ? (
          <p className="sidecar-compare-dialog__warning">{mediaWarning}</p>
        ) : (
          <p className="sidecar-compare-dialog__media-ok">Same media file</p>
        )}
        {importableDifferences ? (
          <>
            <div className="sidecar-compare-dialog__toolbar">
              <label className="sidecar-compare-dialog__select-all">
                <input
                  type="checkbox"
                  checked={comparison.items.some((entry) => entry.status === 'new') && comparison.items.filter((entry) => entry.status === 'new').every((entry) => selectedIds.has(entry.item.id))}
                  onChange={(event) => toggleNew(event.target.checked)}
                />
                Select all new items
              </label>
              <div className="sidecar-compare-dialog__filters" aria-label="Filter comparison">
                {([
                  ['all', 'All'],
                  ['new', 'New'],
                  ['duplicate', 'Already present'],
                  ['conflict', 'Needs attention']
                ] as const).map(([value, label]) => (
                  <button key={value} type="button" className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>{label}</button>
                ))}
              </div>
            </div>
            <div className="sidecar-compare-dialog__list">
              {groups.map(({ type, entries }) => (
                <section className="sidecar-compare-dialog__group" key={type}>
                  <h3>{labels[type]}</h3>
                  {entries.map((entry) => (
                    <label className={`sidecar-compare-dialog__item sidecar-compare-dialog__item--${entry.status}`} key={entry.item.id}>
                      <input
                        type="checkbox"
                        disabled={entry.status === 'duplicate'}
                        checked={entry.status !== 'duplicate' && selectedIds.has(entry.item.id)}
                        onChange={() => toggle(entry.item.id)}
                      />
                      <span className="sidecar-compare-dialog__item-copy">
                        <span>{formatSidecarItem(entry.item)}</span>
                        {conflictExplanation(entry) ? <small>{conflictExplanation(entry)}</small> : null}
                      </span>
                      <span className={`sidecar-compare-dialog__status sidecar-compare-dialog__status--${entry.status}`}>{statusLabel(entry.status)}</span>
                    </label>
                  ))}
                </section>
              ))}
              {groups.length === 0 ? <p className="sidecar-compare-dialog__filtered-empty">No items match this filter.</p> : null}
            </div>
          </>
        ) : (
          <div className="sidecar-compare-dialog__empty">
            <div className="sidecar-compare-dialog__empty-heading">
              <CheckIcon size={20} className="sidecar-compare-dialog__empty-icon" />
              <strong>Nothing new to import.</strong>
            </div>
            <p>This VEIL matches the current sidecar.</p>
            <small>All items in the imported VEIL are already present.</small>
          </div>
        )}
      </div>
    </Modal>
  )
}

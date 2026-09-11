import type { GroupColorToken } from '../types/track'
import type { SelectableItemType } from '../lib/trackItems'
import { includesTimelineSelectionItem, type SelectedTimelineItem } from '../lib/timelineMultiSelection'
import TimelineBar, { type TimelineBarItem, type TimelineDragMode } from './TimelineBar'

interface TimelineRowProps {
  trackRef?: React.Ref<HTMLDivElement>
  items: TimelineBarItem[]
  itemType: SelectableItemType
  duration: number
  selectedItemId: string | null
  selectedItemType: SelectableItemType | null
  selectedItems?: readonly SelectedTimelineItem[]
  activeIds: ReadonlySet<string>
  dragItemId: string | null
  previewStart: number | null
  previewEnd: number | null
  onSelect: (id: string, type: SelectableItemType, toggleSelected?: boolean) => void
  onSelectExclusive: (id: string, type: SelectableItemType) => void
  onDragStart: (
    item: TimelineBarItem,
    mode: TimelineDragMode,
    event: PointerEvent,
    captureEl: HTMLElement
  ) => void
  onTrackPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void
  onTrackDoubleClick?: (event: React.MouseEvent<HTMLDivElement>) => void

  groupColorByItemId?: ReadonlyMap<string, GroupColorToken>
}

export default function TimelineRow({
  trackRef,
  items,
  itemType,
  duration,
  selectedItemId,
  selectedItemType,
  selectedItems = [],
  activeIds,
  dragItemId,
  previewStart,
  previewEnd,
  onSelect,
  onSelectExclusive,
  onDragStart,
  onTrackPointerDown,
  onTrackDoubleClick,

  groupColorByItemId
}: TimelineRowProps) {
  return (
    <div className={`timeline-row timeline-row--${itemType}`}>
      <div
        ref={trackRef}
        className="timeline-row__track"
      >
        <div
          className="timeline-row__usable-track"
          onPointerDown={onTrackPointerDown}
          onDoubleClick={onTrackDoubleClick}

        >
          {items.map((item) => {
            const isDragging = dragItemId === item.id
            return (
              <TimelineBar
              key={item.id}
              item={item}
              duration={duration}
              isSelected={selectedItems.length > 0
                ? includesTimelineSelectionItem(selectedItems, item.id, itemType)
                : selectedItemId === item.id && selectedItemType === itemType}
              isActive={activeIds.has(item.id)}
              groupColorToken={groupColorByItemId?.get(item.id)}
              previewStart={isDragging && previewStart !== null ? previewStart : undefined}
              previewEnd={isDragging && previewEnd !== null ? previewEnd : undefined}
              onSelect={(toggleSelected) => onSelect(item.id, itemType, toggleSelected)}
              onSelectExclusive={() => onSelectExclusive(item.id, itemType)}
              onDragStart={(mode, event, captureEl) => onDragStart(item, mode, event, captureEl)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

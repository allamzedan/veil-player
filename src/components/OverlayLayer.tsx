import { useCallback, useMemo } from 'react'
import {
  videoContentLayoutStyle,
  videoContentLayoutToClientRect,
  type VideoContentLayout
} from '../lib/videoRect'
import { useVeilStore } from '../state/useVeilStore'
import { activeTimelineMaskEditorId } from '../lib/timelineMultiSelection'
import type { MaskTrackItem, PercentRect } from '../types/track'
import MaskBox from './MaskBox'

export interface MaskRenderSpec {
  mask: MaskTrackItem
  effectiveOpacity?: number
}

interface OverlayLayerProps {
  stageRef: React.RefObject<HTMLDivElement | null>
  contentLayout: VideoContentLayout | null
  readOnly?: boolean
  /** When set, only these masks are drawn (e.g. reconcilePlayback active list). Defaults to all store masks. */
  masksToRender?: MaskTrackItem[] | MaskRenderSpec[]
}

function normalizeMaskRenderSpecs(
  masks: MaskTrackItem[] | MaskRenderSpec[] | undefined,
  allMasks: MaskTrackItem[]
): MaskRenderSpec[] {
  const source = masks ?? allMasks
  if (source.length === 0) {
    return []
  }
  const first = source[0]
  if ('mask' in first) {
    return source as MaskRenderSpec[]
  }
  return (source as MaskTrackItem[]).map((mask) => ({ mask }))
}

export default function OverlayLayer({
  stageRef,
  contentLayout,
  readOnly = false,
  masksToRender
}: OverlayLayerProps) {
  const allMasks = useVeilStore((state) => state.masks)
  const selectedItemId = useVeilStore((state) => state.selectedItemId)
  const selectedItemType = useVeilStore((state) => state.selectedItemType)
  const patchMaskRect = useVeilStore((state) => state.patchMaskRect)
  const setSelectedItem = useVeilStore((state) => state.setSelectedItem)

  const renderedSpecs = useMemo(
    () => normalizeMaskRenderSpecs(masksToRender, allMasks),
    [masksToRender, allMasks]
  )

  const selectedMaskId = activeTimelineMaskEditorId(selectedItemId, selectedItemType)

  const getContainerRect = useCallback((): DOMRect | null => {
    const stage = stageRef.current
    if (!stage || !contentLayout) {
      return null
    }

    return videoContentLayoutToClientRect(contentLayout, stage)
  }, [contentLayout, stageRef])

  const boundsStyle = videoContentLayoutStyle(contentLayout)

  const onSelect = useCallback(
    (id: string) => {
      setSelectedItem(id, 'mask')
    },
    [setSelectedItem]
  )

  const onPatchRect = useCallback(
    (id: string, rect: PercentRect) => {
      patchMaskRect(id, rect)
    },
    [patchMaskRect]
  )

  const unselected = renderedSpecs.filter((spec) => spec.mask.id !== selectedMaskId)
  const selected = renderedSpecs.find((spec) => spec.mask.id === selectedMaskId)

  return (
    <>
      <div className="overlay-layer" style={boundsStyle} aria-hidden={renderedSpecs.length === 0}>
        {unselected.map(({ mask, effectiveOpacity }) => (
          <MaskBox
            key={mask.id}
            mask={mask}
            selected={false}
            dimmed={mask.enabled === false}
            effectiveOpacity={effectiveOpacity}
            renderMode="fill"
            readOnly={readOnly}
            getContainerRect={getContainerRect}
            onSelect={onSelect}
            onPatchRect={onPatchRect}
          />
        ))}
        {selected ? (
          <MaskBox
            key={selected.mask.id}
            mask={selected.mask}
            selected
            dimmed={selected.mask.enabled === false}
            effectiveOpacity={selected.effectiveOpacity}
            renderMode="fill"
            readOnly={readOnly}
            getContainerRect={getContainerRect}
            onSelect={onSelect}
            onPatchRect={onPatchRect}
          />
        ) : null}
      </div>
      {selected && !readOnly ? (
        <div className="editor-overlay" style={boundsStyle} aria-hidden={false}>
          <MaskBox
            key={`${selected.mask.id}-handles`}
            mask={selected.mask}
            selected
            dimmed={selected.mask.enabled === false}
            effectiveOpacity={selected.effectiveOpacity}
            renderMode="handles"
            readOnly={readOnly}
            getContainerRect={getContainerRect}
            onSelect={onSelect}
            onPatchRect={onPatchRect}
          />
        </div>
      ) : null}
    </>
  )
}

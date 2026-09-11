import { GROUP_COLOR_TOKENS, type GroupColorToken } from '../types/track'
import { useLanguage } from '../hooks/useLanguage'
import { getGroupIdForItem } from '../lib/trackGrouping'
import { t } from '../i18n'
import { useVeilStore } from '../state/useVeilStore'

interface TrackGroupsPanelProps {
  hiddenGroupIds: Set<string>
  soloGroupId: string | null
  totalItemCount: number
  onToggleHidden: (groupId: string) => void
  onSetSoloGroup: (groupId: string | null) => void
  onCollapseAll: () => void
  onExpandAll: () => void
  onClearSolo: () => void
}

export default function TrackGroupsPanel({
  hiddenGroupIds,
  soloGroupId,
  totalItemCount,
  onToggleHidden,
  onSetSoloGroup,
  onCollapseAll,
  onExpandAll,
  onClearSolo
}: TrackGroupsPanelProps) {
  useLanguage()
  const groups = useVeilStore((state) => state.groups)
  const selectedItemId = useVeilStore((state) => state.selectedItemId)
  const addGroup = useVeilStore((state) => state.addGroup)
  const removeGroup = useVeilStore((state) => state.removeGroup)
  const renameGroup = useVeilStore((state) => state.renameGroup)
  const setGroupColorToken = useVeilStore((state) => state.setGroupColorToken)
  const assignItemToGroup = useVeilStore((state) => state.assignItemToGroup)
  const disableGroupItems = useVeilStore((state) => state.disableGroupItems)
  const enableGroupItems = useVeilStore((state) => state.enableGroupItems)

  const selectedGroupId =
    selectedItemId !== null ? getGroupIdForItem(groups, selectedItemId) : null

  const summary =
    groups.length === 0
      ? t('groups.noGroups')
      : groups.length === 1
        ? soloGroupId
          ? t('groups.summarySolo', { count: groups.length, items: totalItemCount })
          : t('groups.summary', { count: groups.length, items: totalItemCount })
        : soloGroupId
          ? t('groups.summaryPluralSolo', { count: groups.length, items: totalItemCount })
          : t('groups.summaryPlural', { count: groups.length, items: totalItemCount })

  return (
    <section className="track-groups-panel" aria-label={t('groups.title')}>
      <h2 className="track-sidebar__title">{t('groups.title')}</h2>
      <p className="track-groups-panel__summary">{summary}</p>
      <div className="track-groups-panel__bulk">
        <button type="button" className="btn btn-ghost btn-compact" onClick={onCollapseAll}>
          {t('groups.collapseAll')}
        </button>
        <button type="button" className="btn btn-ghost btn-compact" onClick={onExpandAll}>
          {t('groups.expandAll')}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-compact"
          disabled={soloGroupId === null}
          onClick={onClearSolo}
        >
          {t('groups.clearSolo')}
        </button>
      </div>
      <button
        type="button"
        className="btn btn-secondary btn-compact"
        onClick={() => addGroup(t('groups.defaultName'))}
      >
        {t('groups.newGroup')}
      </button>
      {groups.length === 0 ? (
        <p className="track-groups-panel__empty">{t('groups.noGroupsYet')}</p>
      ) : (
        <ul className="track-groups-panel__list">
          {groups.map((group) => {
            const isHidden = hiddenGroupIds.has(group.id)
            const isSolo = soloGroupId === group.id
            return (
              <li key={group.id} className="track-groups-panel__item">
                <input
                  type="text"
                  className="track-groups-panel__name"
                  value={group.label}
                  onChange={(event) => renameGroup(group.id, event.target.value)}
                />
                <span className="track-groups-panel__count">{group.itemIds.length}</span>
                <select
                  className="track-groups-panel__color"
                  value={group.colorToken ?? ''}
                  aria-label={t('groups.groupColor')}
                  onChange={(event) =>
                    setGroupColorToken(
                      group.id,
                      (event.target.value as GroupColorToken) || null
                    )
                  }
                >
                  <option value="">{t('groups.noTint')}</option>
                  {GROUP_COLOR_TOKENS.map((token) => (
                    <option key={token} value={token}>
                      {token}
                    </option>
                  ))}
                </select>
                <div className="track-groups-panel__actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-compact"
                    title={t('groups.assignToGroup')}
                    disabled={selectedItemId === null}
                    onClick={() => {
                      if (selectedItemId) {
                        assignItemToGroup(selectedItemId, group.id)
                      }
                    }}
                  >
                    {t('groups.assign')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-compact"
                    title={t('groups.disableGroup')}
                    onClick={() => disableGroupItems(group.id)}
                  >
                    {t('common.off')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-compact"
                    title={t('groups.enableGroup')}
                    onClick={() => enableGroupItems(group.id)}
                  >
                    {t('common.on')}
                  </button>
                  <button
                    type="button"
                    className={`btn btn-ghost btn-compact${isHidden ? ' track-groups-panel__btn--active' : ''}`}
                    title={t('groups.hideInList')}
                    onClick={() => onToggleHidden(group.id)}
                  >
                    {t('common.hide')}
                  </button>
                  <button
                    type="button"
                    className={`btn btn-ghost btn-compact${isSolo ? ' track-groups-panel__btn--active' : ''}`}
                    title={t('groups.soloInList')}
                    onClick={() => onSetSoloGroup(isSolo ? null : group.id)}
                  >
                    {t('common.solo')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-compact"
                    aria-label={t('groups.deleteGroup')}
                    onClick={() => removeGroup(group.id)}
                  >
                    ×
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {selectedItemId && groups.length > 1 ? (
        <label className="track-groups-panel__assign field">
          <span className="field__label">{t('groups.assignSelected')}</span>
          <select
            className="track-groups-panel__assign-select"
            defaultValue=""
            onChange={(event) => {
              const groupId = event.target.value
              if (groupId && selectedItemId) {
                assignItemToGroup(selectedItemId, groupId)
                event.target.value = ''
              }
            }}
          >
            <option value="">{t('groups.chooseGroup')}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {selectedItemId && selectedGroupId === null && groups.length <= 1 ? (
        <p className="track-groups-panel__hint">{t('groups.ungroupedHint')}</p>
      ) : null}
    </section>
  )
}

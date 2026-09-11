import { useLanguage } from '../hooks/useLanguage'
import {
  formatTagsForInput,
  parseTagsInput,
  TRACK_METADATA_LIMITS
} from '../lib/trackMetadataValidation'
import { t } from '../i18n'
import { useVeilStore } from '../state/useVeilStore'

export default function TrackMetadataPanel() {
  useLanguage()
  const trackMetadata = useVeilStore((state) => state.trackMetadata)
  const patchTrackMetadata = useVeilStore((state) => state.patchTrackMetadata)

  const onTagsBlur = (raw: string): void => {
    const tags = parseTagsInput(raw)
    patchTrackMetadata({ tags: tags.length > 0 ? tags : undefined })
  }

  return (
    <section className="track-metadata-panel" aria-label={t('sidebar.trackInfo')}>
      <h2 className="track-sidebar__title">{t('sidebar.trackInfo')}</h2>
      <label className="track-metadata-panel__field">
        <span>{t('trackInfo.titleField')}</span>
        <input
          type="text"
          maxLength={TRACK_METADATA_LIMITS.titleMax}
          value={trackMetadata.title ?? ''}
          onChange={(event) =>
            patchTrackMetadata({ title: event.target.value || undefined })
          }
        />
      </label>
      <label className="track-metadata-panel__field">
        <span>{t('trackInfo.description')}</span>
        <textarea
          rows={3}
          maxLength={TRACK_METADATA_LIMITS.descriptionMax}
          value={trackMetadata.description ?? ''}
          onChange={(event) =>
            patchTrackMetadata({ description: event.target.value || undefined })
          }
        />
      </label>
      <label className="track-metadata-panel__field">
        <span>{t('trackInfo.author')}</span>
        <input
          type="text"
          maxLength={TRACK_METADATA_LIMITS.authorMax}
          placeholder={t('trackInfo.authorPlaceholder')}
          value={trackMetadata.author ?? ''}
          onChange={(event) =>
            patchTrackMetadata({ author: event.target.value || undefined })
          }
        />
      </label>
      <label className="track-metadata-panel__field">
        <span>{t('trackInfo.tags')}</span>
        <input
          type="text"
          placeholder={t('trackInfo.tagsPlaceholder')}
          defaultValue={formatTagsForInput(trackMetadata.tags)}
          key={formatTagsForInput(trackMetadata.tags)}
          onBlur={(event) => onTagsBlur(event.target.value)}
        />
        <span className="track-metadata-panel__hint">{t('trackInfo.tagsHint')}</span>
      </label>
      <label className="track-metadata-panel__field">
        <span>{t('trackInfo.language')}</span>
        <input
          type="text"
          maxLength={TRACK_METADATA_LIMITS.languageMax}
          placeholder={t('trackInfo.languagePlaceholder')}
          value={trackMetadata.language ?? ''}
          onChange={(event) =>
            patchTrackMetadata({ language: event.target.value || undefined })
          }
        />
      </label>
      <label className="track-metadata-panel__field">
        <span>{t('trackInfo.notes')}</span>
        <textarea
          rows={3}
          maxLength={TRACK_METADATA_LIMITS.notesMax}
          value={trackMetadata.notes ?? ''}
          onChange={(event) =>
            patchTrackMetadata({ notes: event.target.value || undefined })
          }
        />
      </label>
    </section>
  )
}

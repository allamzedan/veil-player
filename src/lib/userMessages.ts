import { t } from '../i18n'

export const userMessages = {
  get invalidTrackJson() {
    return t('userMessages.invalidTrackJson')
  },
  get invalidTrackPayload() {
    return t('userMessages.invalidTrackPayload')
  },
  get saveNeedsVideo() {
    return t('userMessages.saveNeedsVideo')
  },
  get saveFailed() {
    return t('userMessages.saveFailed')
  },
  get saveCanceled() {
    return t('userMessages.saveCanceled')
  },
  get loadFailed() {
    return t('userMessages.loadFailed')
  },
  get trackLoaded() {
    return t('userMessages.trackLoaded')
  },
  get trackSaved() {
    return t('userMessages.trackSaved')
  },
  get trackDownloaded() {
    return t('userMessages.trackDownloaded')
  },
  get invalidVideo() {
    return t('userMessages.invalidVideo')
  },
  get invalidMedia() {
    return t('userMessages.invalidMedia')
  },
  get seekFailed() {
    return t('userMessages.seekFailed')
  },
  get masksUnavailableForAudio() {
    return t('media.masksUnavailable')
  },
  get openVideoFailed() {
    return t('userMessages.openVideoFailed')
  },
  get readTrackFailed() {
    return t('userMessages.readTrackFailed')
  },
  get readTrackFileFailed() {
    return t('userMessages.readTrackFileFailed')
  },
  get srtReadFailed() {
    return t('userMessages.srtReadFailed')
  },
  get srtNoCues() {
    return t('userMessages.srtNoCues')
  },
  get srtNoOptions() {
    return t('userMessages.srtNoOptions')
  }
} as const

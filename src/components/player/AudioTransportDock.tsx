import type { RefObject } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { t } from '../../i18n'
import { formatTime } from '../../lib/time'
import type { PlaybackSpeedPreset } from '../../lib/playbackHelpers'
import { AUDIO_SEEK_STEP_SECONDS } from '../../lib/relativeSeek'
import PlaybackRateControl from '../PlaybackRateControl'
import PlayerUtilityControls from '../PlayerUtilityControls'
import VolumeControl from '../VolumeControl'
import ProgressBookmarkMarkers from '../ProgressBookmarkMarkers'
import { PlaybackSeekBar } from '../PlaybackSeekBar'
import type { BookmarkTrackItem } from '../../types/track'

interface AudioTransportDockProps {
  videoRef: RefObject<HTMLVideoElement | null>
  isPlaying: boolean
  displayTime: number
  duration: number
  playbackRate: PlaybackSpeedPreset
  subtitleSheetOpen: boolean
  onTogglePlayPause: () => void
  onSeekRelative: (offsetSeconds: number) => void
  onSeekInput: (event: React.ChangeEvent<HTMLInputElement>) => void
  onSeekStart: () => void
  onSeekEnd: () => void
  onPlaybackRateChange: (rate: PlaybackSpeedPreset) => void
  onAddMute: () => void
  onAddSkip: () => void
  onAddBookmark: () => void
  bookmarks: BookmarkTrackItem[]
  selectedBookmarkId: string | null
  onSelectBookmark: (id: string) => void
  onSeekBookmark: (time: number) => void
}

function SeekBack10Icon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.55">
      <path d="M8 7H4V3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 7.2A8 8 0 1 1 4 14" strokeLinecap="round" />
      <text x="7.1" y="15.2" fill="currentColor" stroke="none" fontSize="8.5" fontWeight="700">10</text>
    </svg>
  )
}

function SeekForward10Icon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.55">
      <path d="M16 7h4V3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.5 7.2A8 8 0 1 0 20 14" strokeLinecap="round" />
      <text x="7.1" y="15.2" fill="currentColor" stroke="none" fontSize="8.5" fontWeight="700">10</text>
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="currentColor">
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="currentColor">
      <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
    </svg>
  )
}

function MuteActionIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.55">
      <path d="M5 12c1.2-2.2 2.4-3.3 3.6-3.3S11 9.8 12.2 12c1.2 2.2 2.4 3.3 3.6 3.3S18.2 14.2 19.4 12" strokeLinecap="round" />
      <path d="M5 12c1.2 2.2 2.4 3.3 3.6 3.3S11 14.2 12.2 12c1.2-2.2 2.4-3.3 3.6-3.3S18.2 9.8 19.4 12" strokeLinecap="round" />
      <path d="M12 5.5v13" strokeLinecap="round" />
    </svg>
  )
}

function SkipActionIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.55">
      <path d="M4 7.5 10.5 12 4 16.5v-9zM11.5 7.5 18 12l-6.5 4.5v-9z" strokeLinejoin="round" />
      <path d="M20 7v10" strokeLinecap="round" />
    </svg>
  )
}

function BookmarkActionIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.55">
      <path d="M7 4h10v16l-5-3.2L7 20V4z" strokeLinejoin="round" />
    </svg>
  )
}

export default function AudioTransportDock({
  videoRef,
  isPlaying,
  displayTime,
  duration,
  playbackRate,
  subtitleSheetOpen,
  onTogglePlayPause,
  onSeekRelative,
  onSeekInput,
  onSeekStart,
  onSeekEnd,
  onPlaybackRateChange,
  onAddMute,
  onAddSkip,
  onAddBookmark,
  bookmarks,
  selectedBookmarkId,
  onSelectBookmark,
  onSeekBookmark
}: AudioTransportDockProps) {
  useLanguage()

  const timelineDuration = duration > 0 ? duration : 0
  const seekValue = Math.min(displayTime, timelineDuration)
  const playLabel = isPlaying ? t('playback.pause') : t('playback.play')

  return (
    <div className="audio-transport-dock" dir="ltr">
      <div className="audio-transport-dock__seek-row">
        <span className="audio-transport-dock__time ltr-digits" aria-hidden>
          {formatTime(displayTime)}
        </span>
        <PlaybackSeekBar
          className="audio-transport-dock__seek"
          duration={timelineDuration}
          step={0.1}
          value={seekValue}
          disabled={timelineDuration <= 0}
          ariaLabel={t('player.seek')}
          ariaValueText={`${formatTime(displayTime)} / ${formatTime(timelineDuration)}`}
          onChange={onSeekInput}
          onMouseDown={onSeekStart}
          onMouseUp={onSeekEnd}
          onTouchStart={onSeekStart}
          onTouchEnd={onSeekEnd}
        >
          <span className="sr-only">{t('player.seek')}</span>
          <ProgressBookmarkMarkers
            bookmarks={bookmarks}
            duration={timelineDuration}
            selectedBookmarkId={selectedBookmarkId}
            onSelect={onSelectBookmark}
            onSeek={onSeekBookmark}
          />
        </PlaybackSeekBar>
        <span className="audio-transport-dock__time ltr-digits audio-transport-dock__time--end" aria-hidden>
          {formatTime(timelineDuration)}
        </span>
      </div>

      <div className="audio-transport-dock__main-row">
        <div className="audio-transport-dock__volume">
          <VolumeControl videoRef={videoRef} orientation="vertical" />
        </div>

        <div className="audio-transport-dock__playback">
          <button
            type="button"
            className="audio-transport-dock__skip-btn"
            onClick={() => onSeekRelative(-AUDIO_SEEK_STEP_SECONDS)}
            aria-label={t('menu.back10Seconds')}
            title={t('menu.back10Seconds')}
          >
            <SeekBack10Icon />
          </button>
          <button
            type="button"
            className="audio-transport-dock__play"
            onClick={onTogglePlayPause}
            aria-label={playLabel}
            title={playLabel}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            type="button"
            className="audio-transport-dock__skip-btn"
            onClick={() => onSeekRelative(AUDIO_SEEK_STEP_SECONDS)}
            aria-label={t('menu.forward10Seconds')}
            title={t('menu.forward10Seconds')}
          >
            <SeekForward10Icon />
          </button>
        </div>

        <div className="audio-transport-dock__utilities">
          <PlaybackRateControl value={playbackRate} onChange={onPlaybackRateChange} variant="dock" />
          <PlayerUtilityControls subtitleSheetOpen={subtitleSheetOpen} variant="dock" />
        </div>
      </div>

      <div className="audio-transport-dock__actions">
        <button
          type="button"
          className="audio-transport-dock__action"
          onClick={onAddMute}
          title={`${t('home.mute')} (U)`}
        >
          <MuteActionIcon />
          <span className="audio-transport-dock__action-label">{t('home.mute')}</span>
          <span className="audio-transport-dock__action-hint" aria-hidden>
            U
          </span>
        </button>
        <button
          type="button"
          className="audio-transport-dock__action"
          onClick={onAddSkip}
          title={`${t('home.skip')} (K)`}
        >
          <SkipActionIcon />
          <span className="audio-transport-dock__action-label">{t('home.skip')}</span>
          <span className="audio-transport-dock__action-hint" aria-hidden>
            K
          </span>
        </button>
        <button
          type="button"
          className="audio-transport-dock__action"
          onClick={onAddBookmark}
          title={`${t('bookmarks.defaultLabel')} (B)`}
        >
          <BookmarkActionIcon />
          <span className="audio-transport-dock__action-label">{t('bookmarks.defaultLabel')}</span>
          <span className="audio-transport-dock__action-hint" aria-hidden>
            B
          </span>
        </button>
      </div>
    </div>
  )
}

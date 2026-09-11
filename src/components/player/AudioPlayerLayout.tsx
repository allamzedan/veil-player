import type { Ref, RefObject } from 'react'
import { useLanguage } from '../../hooks/useLanguage'
import { t } from '../../i18n'
import type { PlaybackSpeedPreset } from '../../lib/playbackHelpers'
import AudioHero from './AudioHero'
import AudioTransportDock from './AudioTransportDock'
import type { BookmarkTrackItem } from '../../types/track'

export interface AudioPlayerLayoutProps {
  videoRef: RefObject<HTMLVideoElement | null>
  mediaRef: Ref<HTMLVideoElement>
  videoSrc: string
  fileName: string | null
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
  onLoadedMetadata: () => void
}

/**
 * Dedicated Audio Watch Mode shell. Owns the player window presentation —
 * not a video-stage adaptation.
 */
export default function AudioPlayerLayout({
  videoRef,
  mediaRef,
  videoSrc,
  fileName,
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
  onSeekBookmark,
  onLoadedMetadata
}: AudioPlayerLayoutProps) {
  useLanguage()

  return (
    <section className="audio-player" aria-label={t('player.ariaLabel')}>
      <video
        key={videoSrc}
        ref={mediaRef}
        className="player-video player-video--audio"
        src={videoSrc}
        playsInline
        onLoadedMetadata={onLoadedMetadata}
        aria-hidden
        tabIndex={-1}
      />
      <div className="audio-player__body">
        <AudioHero
          fileName={fileName}
          isPlaying={isPlaying}
          displayTime={displayTime}
          duration={duration}
        />
        <AudioTransportDock
          videoRef={videoRef}
          isPlaying={isPlaying}
          displayTime={displayTime}
          duration={duration}
          playbackRate={playbackRate}
          subtitleSheetOpen={subtitleSheetOpen}
          onTogglePlayPause={onTogglePlayPause}
          onSeekRelative={onSeekRelative}
          onSeekInput={onSeekInput}
          onSeekStart={onSeekStart}
          onSeekEnd={onSeekEnd}
          onPlaybackRateChange={onPlaybackRateChange}
          onAddMute={onAddMute}
          onAddSkip={onAddSkip}
          onAddBookmark={onAddBookmark}
          bookmarks={bookmarks}
          selectedBookmarkId={selectedBookmarkId}
          onSelectBookmark={onSelectBookmark}
          onSeekBookmark={onSeekBookmark}
        />
      </div>
    </section>
  )
}

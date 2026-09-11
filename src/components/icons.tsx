import type { ReactNode } from 'react'

interface IconProps {
  size?: number
  className?: string
}

export function ZoomOutIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35M8 11h6" />
    </svg>
  )
}

export function ZoomInIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
    </svg>
  )
}

export function VolumeMutedIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      <path d="m16 9 5 5M21 9l-5 5" />
    </svg>
  )
}

export function VolumeLowIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      <path d="M15.5 12.5a3 3 0 0 0 0-5" />
    </svg>
  )
}

export function VolumeHighIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  )
}

export function FullscreenEnterIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

function ToolIcon({
  size = 16,
  className,
  children
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  )
}

export function MaskIcon(props: IconProps) {
  return <ToolIcon {...props}><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h8M8 13h5" /></ToolIcon>
}

export function MuteIcon(props: IconProps) {
  return <ToolIcon {...props}><path d="M11 5 6 9H3v6h3l5 4V5zM16 9l5 5M21 9l-5 5" /></ToolIcon>
}

export function SkipIcon(props: IconProps) {
  return <ToolIcon {...props}><path d="m5 5 10 7L5 19V5zM19 5v14" /></ToolIcon>
}

export function BookmarkIcon(props: IconProps) {
  return <ToolIcon {...props}><path d="M6 4h12v17l-6-4-6 4V4z" /></ToolIcon>
}

export function EditIcon(props: IconProps) {
  return <ToolIcon {...props}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></ToolIcon>
}

export function CopyIcon(props: IconProps) {
  return <ToolIcon {...props}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" /></ToolIcon>
}

export function CheckIcon(props: IconProps) {
  return <ToolIcon {...props}><path d="m5 12 4 4L19 6" /></ToolIcon>
}

export function TrashIcon(props: IconProps) {
  return <ToolIcon {...props}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" /></ToolIcon>
}

export function PowerIcon(props: IconProps) {
  return <ToolIcon {...props}><path d="M12 2v10M6.35 5.35a8 8 0 1 0 11.3 0" /></ToolIcon>
}

export function LockIcon(props: IconProps) {
  return <ToolIcon {...props}><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></ToolIcon>
}

export function UnlockIcon(props: IconProps) {
  return <ToolIcon {...props}><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 7.5-2" /></ToolIcon>
}

export function InspectorCollapseIcon(props: IconProps) {
  return <ToolIcon {...props}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16M11 9l-3 3 3 3" /></ToolIcon>
}

export function ZoomToSelectionIcon(props: IconProps) {
  return <ToolIcon {...props}>
    <path d="M4 9V4h5M15 4h5v5M4 15v5h5" />
    <circle cx="15.5" cy="15.5" r="3.5" />
    <path d="m18 18 2.5 2.5" />
  </ToolIcon>
}

export function CenterOnPlayheadIcon(props: IconProps) {
  return <ToolIcon {...props}><circle cx="12" cy="12" r="5" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></ToolIcon>
}

export function SetStartIcon(props: IconProps) {
  return <ToolIcon {...props}><path d="M6 4v16M9 7h9v10H9" /></ToolIcon>
}

export function SetEndIcon(props: IconProps) {
  return <ToolIcon {...props}><path d="M18 4v16M6 7h9v10H6" /></ToolIcon>
}

export function MoveToPlayheadIcon(props: IconProps) {
  return <ToolIcon {...props}><path d="M12 4v16M3 12h6M6 9l3 3-3 3M21 12h-6M18 9l-3 3 3 3" /></ToolIcon>
}

export function JumpToStartIcon(props: IconProps) {
  return <ToolIcon {...props}><path d="M6 4v16M19 12H9M15 8l4 4-4 4" /></ToolIcon>
}

export function SnapToSubtitlesIcon(props: IconProps) {
  return <ToolIcon {...props}><path d="M7 4v7a5 5 0 0 0 10 0V4M7 4h4v5H7M13 4h4v5h-4" /></ToolIcon>
}

export function CaptionsIcon(props: IconProps) {
  return <ToolIcon {...props}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 10h3M14 10h3M7 14h4M13 14h4" /></ToolIcon>
}

export function SubtitleFileIcon(props: IconProps) {
  return <ToolIcon {...props}><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 13h2M13 13h2M9 17h6" /></ToolIcon>
}

export function UploadFileIcon(props: IconProps) {
  return <ToolIcon {...props}><path d="M6 3h8l4 4v4M14 3v5h4M12 21v-8M8.5 16.5 12 13l3.5 3.5" /></ToolIcon>
}

export function EyeIcon(props: IconProps) {
  return <ToolIcon {...props}><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></ToolIcon>
}

export function EyeOffIcon(props: IconProps) {
  return <ToolIcon {...props}><path d="m3 3 18 18M10.6 6.2A10.6 10.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16.5 16.5 0 0 1-2.2 2.8M6.6 6.7C4 8.4 2.5 12 2.5 12s3.5 6 9.5 6a10.8 10.8 0 0 0 3.2-.5M9.9 9.9a3 3 0 0 0 4.2 4.2" /></ToolIcon>
}

export function RefreshIcon(props: IconProps) {
  return <ToolIcon {...props}><path d="M20 7v5h-5M4 17v-5h5M18.5 9A7 7 0 0 0 6 6.5L4 9M5.5 15A7 7 0 0 0 18 17.5l2-2.5" /></ToolIcon>
}

export function SettingsIcon(props: IconProps) {
  return <ToolIcon {...props}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></ToolIcon>
}

export function PlayIcon(props: IconProps) {
  return <ToolIcon {...props}><path d="m8 5 11 7-11 7V5Z" /></ToolIcon>
}

export function PauseIcon(props: IconProps) {
  return <ToolIcon {...props}><path d="M8 5v14M16 5v14" /></ToolIcon>
}

export function StopIcon(props: IconProps) {
  return <ToolIcon {...props}><rect x="6" y="6" width="12" height="12" rx="1" /></ToolIcon>
}

export function LayersIcon(props: IconProps) {
  return <ToolIcon {...props}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></ToolIcon>
}

export function GoToPositionIcon(props: IconProps) {
  return <ToolIcon {...props}><path d="M5 5v14M19 12H7M15 8l4 4-4 4" /></ToolIcon>
}

export function FullscreenExitIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M9 3v6H3M21 9h-6V3M3 15h6v6M15 21v-6h6" />
    </svg>
  )
}

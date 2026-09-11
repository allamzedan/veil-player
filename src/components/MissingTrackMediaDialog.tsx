import type { TrackVideoSnapshot } from '../lib/fingerprint'
import Modal from './Modal'

interface MissingTrackMediaDialogProps {
  expected: TrackVideoSnapshot | null
  pending: boolean
  onLocate: () => void
  onContinue: () => void
}

export default function MissingTrackMediaDialog({
  expected,
  pending,
  onLocate,
  onContinue
}: MissingTrackMediaDialogProps) {
  return (
    <Modal
      open={expected !== null}
      title="Referenced media not found"
      onClose={pending ? undefined : onContinue}
      closeOnBackdrop={!pending}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onContinue} disabled={pending}>
            Continue without media
          </button>
          <button type="button" className="btn" onClick={onLocate} disabled={pending}>
            Locate File...
          </button>
        </>
      }
    >
      {expected ? (
        <p>
          The annotations were loaded safely, but "{expected.name}" is not available.
          Locate the moved media file to enable playback. VEIL will not search your disk automatically.
        </p>
      ) : null}
    </Modal>
  )
}

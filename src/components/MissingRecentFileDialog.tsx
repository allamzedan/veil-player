import Modal from './Modal'

export interface MissingRecentTarget {
  kind: 'video' | 'veil'
  filePath: string
}

interface MissingRecentFileDialogProps {
  target: MissingRecentTarget | null
  pending: boolean
  onLocate: () => void
  onRemove: () => void
  onCancel: () => void
}

function fileName(filePath: string): string {
  return filePath.split(/[/\\]/).pop() ?? filePath
}

export default function MissingRecentFileDialog({
  target,
  pending,
  onLocate,
  onRemove,
  onCancel
}: MissingRecentFileDialogProps) {
  return (
    <Modal
      open={target !== null}
      title="File not found"
      onClose={pending ? undefined : onCancel}
      closeOnBackdrop={!pending}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </button>
          <button type="button" className="btn btn-secondary" onClick={onRemove} disabled={pending}>
            Remove from Recent
          </button>
          <button type="button" className="btn" onClick={onLocate} disabled={pending}>
            Locate File…
          </button>
        </>
      }
    >
      {target ? (
        <p>
          VEIL Player can’t find &quot;{fileName(target.filePath)}&quot; at its previous location.
          {' '}It may have been moved, renamed, or deleted.
        </p>
      ) : null}
    </Modal>
  )
}

const STORAGE_KEY = 'veil:workflowMetrics'

export type WorkflowMetricKey =
  | 'undo'
  | 'redo'
  | 'quickReplay'
  | 'holdReveal'
  | 'presetApply'
  | 'speedChange'
  | 'snapEngage'
  | 'shortcutUsed'

type WorkflowMetrics = Record<WorkflowMetricKey, number>

const DEFAULT_METRICS: WorkflowMetrics = {
  undo: 0,
  redo: 0,
  quickReplay: 0,
  holdReveal: 0,
  presetApply: 0,
  speedChange: 0,
  snapEngage: 0,
  shortcutUsed: 0
}

function readMetrics(): WorkflowMetrics {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return { ...DEFAULT_METRICS }
  }
  try {
    const parsed = JSON.parse(raw) as Partial<WorkflowMetrics>
    return { ...DEFAULT_METRICS, ...parsed }
  } catch {
    return { ...DEFAULT_METRICS }
  }
}

function writeMetrics(metrics: WorkflowMetrics): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics))
}

export function incrementWorkflowMetric(key: WorkflowMetricKey): void {
  const metrics = readMetrics()
  metrics[key] += 1
  writeMetrics(metrics)
}

export function readWorkflowMetrics(): WorkflowMetrics {
  return readMetrics()
}

export function formatWorkflowMetricsForCopy(): string {
  return JSON.stringify(readMetrics(), null, 2)
}

export function isDevMetricsEnabled(): boolean {
  if (!import.meta.env.DEV) {
    return false
  }

  try {
    return (
      localStorage.getItem('veil:debugSeek') === '1' ||
      localStorage.getItem('veil:debugMatching') === '1'
    )
  } catch {
    return false
  }
}

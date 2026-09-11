import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const gitRaw = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
const git = (...args) => gitRaw(...args).trim()

function decodeGitPath(value) {
  const trimmed = value.trim()
  if (trimmed.charCodeAt(0) === 34) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return trimmed
    }
  }
  return trimmed
}

function isGeneratedReleasePath(path) {
  const normalized = path.replaceAll('\\', '/')
  return normalized.startsWith('release/') || normalized.startsWith('release-validation/')
}

function readSchemaVersion() {
  const source = readFileSync(resolve(root, 'src/types/track.ts'), 'utf8')
  const supported = source.match(/SUPPORTED_TRACK_VERSION\s*=\s*([A-Z0-9_]+)/)?.[1]
  if (!supported) return 'unknown'
  const assignment = new RegExp('(?:export\\s+)?const\\s+' + supported + "\\s*=\\s*'([^']+)'")
  return source.match(assignment)?.[1] ?? 'unknown'
}

const branch = git('branch', '--show-current') || '(detached)'
const head = git('rev-parse', 'HEAD')
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const statusLines = gitRaw('status', '--porcelain=v1', '--untracked-files=all')
  .split(/\r?\n/)
  .filter(Boolean)
const unexpected = statusLines.filter((line) => {
  const path = decodeGitPath(line.slice(3).split(' -> ').at(-1))
  return !isGeneratedReleasePath(path)
})

const operationMarkers = [
  'MERGE_HEAD',
  'CHERRY_PICK_HEAD',
  'REVERT_HEAD',
  'BISECT_LOG',
  'rebase-apply',
  'rebase-merge',
  'sequencer'
]
const activeOperations = operationMarkers.filter((name) => {
  const marker = git('rev-parse', '--git-path', name)
  return existsSync(resolve(root, marker))
})

console.log('Branch: ' + branch)
console.log('HEAD: ' + head)
console.log('App version: ' + packageJson.version)
console.log('Track schema: ' + readSchemaVersion())
console.log('Active Git operation: ' + (activeOperations.join(', ') || 'none'))
console.log('Unexpected non-release changes: ' + unexpected.length)
for (const line of unexpected) console.error('  ' + line)

if (activeOperations.length > 0 || unexpected.length > 0) process.exitCode = 1

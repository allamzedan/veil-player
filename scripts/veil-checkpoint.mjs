import { execFileSync, spawnSync } from 'node:child_process'

const root = process.cwd()
const args = process.argv.slice(2)
const force = args.includes('--force')
const names = args.filter((arg) => arg !== '--force')

if (names.length !== 1 || !/^[a-z0-9][a-z0-9._/-]*$/i.test(names[0])) {
  console.error('Usage: npm run veil:checkpoint -- <name> [--force]')
  process.exit(2)
}

const name = names[0]
const branch = 'archive/' + name
const tag = name
const git = (...gitArgs) =>
  execFileSync('git', gitArgs, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const refExists = (ref) =>
  spawnSync('git', ['show-ref', '--verify', '--quiet', ref], { cwd: root }).status === 0

git('check-ref-format', '--branch', branch)
git('check-ref-format', 'refs/tags/' + tag)

const branchExists = refExists('refs/heads/' + branch)
const tagExists = refExists('refs/tags/' + tag)
if ((branchExists || tagExists) && !force) {
  console.error('Checkpoint already exists; pass --force to overwrite explicitly.')
  console.error('Branch exists: ' + branchExists)
  console.error('Tag exists: ' + tagExists)
  process.exit(1)
}

const head = git('rev-parse', 'HEAD')
if (branchExists && git('branch', '--show-current') === branch) {
  console.error('Refusing to move the currently checked-out archive branch.')
  process.exit(1)
}

git('branch', ...(force ? ['-f'] : []), branch, head)
git('tag', ...(force ? ['-f'] : []), '-a', tag, head, '-m', 'Checkpoint ' + name)
console.log('Checkpoint HEAD: ' + head)
console.log('Archive branch: ' + branch)
console.log('Annotated tag: ' + tag)

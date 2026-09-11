import { spawnSync } from 'node:child_process'

const npmCli = process.env.npm_execpath
if (!npmCli) {
  console.error('Run this helper through its npm script so npm_execpath is available.')
  process.exit(2)
}
const args = process.argv.slice(2)
const focused = args[0] === '--focused'
const targets = focused ? args.slice(1) : []

if (focused && targets.length === 0) {
  console.error('Usage: npm run veil:validate:focused -- <test-file> [more-test-files]')
  process.exit(2)
}
if (!focused && args.length > 0) {
  console.error('Full validation accepts no arguments.')
  process.exit(2)
}

function run(script, extra = []) {
  const commandArgs = ['run', script, ...extra]
  console.log('\n> npm ' + commandArgs.join(' '))
  const result = spawnSync(process.execPath, [npmCli, ...commandArgs], {
    stdio: 'inherit',
    shell: false
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('css:check')
if (focused) {
  run('test', ['--', ...targets])
} else {
  for (const script of [
    'typecheck',
    'build',
    'qa',
    'dist',
    'verify:build',
    'smoke:packaged'
  ]) run(script)
}

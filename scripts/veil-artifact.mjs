import { createHash } from 'node:crypto'
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'

const root = process.cwd()
const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version
const directories = [
  resolve(root, 'release'),
  ...readdirSync(root)
    .filter((name) => name.startsWith('release-'))
    .map((name) => resolve(root, name))
].filter((path) => existsSync(path))

const candidates = directories.flatMap((directory) =>
  readdirSync(directory)
    .filter((name) => name.endsWith('-portable.exe') && name.includes(version))
    .map((name) => join(directory, name))
)

if (candidates.length === 0) {
  console.error('No VEIL ' + version + ' portable executable found in release directories.')
  process.exit(1)
}

const artifact = candidates.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0]
const stat = statSync(artifact)
const hash = createHash('sha256')
for await (const chunk of createReadStream(artifact)) hash.update(chunk)

console.log('Artifact: ' + relative(root, artifact))
console.log('Filename: ' + basename(artifact))
console.log('Timestamp: ' + stat.mtime.toISOString())
console.log('Size: ' + stat.size + ' bytes (' + (stat.size / 1048576).toFixed(2) + ' MiB)')
console.log('SHA-256: ' + hash.digest('hex'))

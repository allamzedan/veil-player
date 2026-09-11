import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const required = [
  'out/main/index.js',
  'out/preload/index.js',
  'out/renderer/index.html',
  'build/icon.ico'
]

let failed = false

for (const rel of required) {
  const path = join(root, rel)
  if (!existsSync(path)) {
    console.error(`MISSING: ${rel}`)
    failed = true
  } else {
    console.log(`OK: ${rel}`)
  }
}

const mainSource = readFileSync(join(root, 'out/main/index.js'), 'utf8')
if (!mainSource.includes('index.js') && !mainSource.includes('index.mjs')) {
  console.error('MISSING: main process must resolve preload script path')
  failed = true
} else {
  console.log('OK: main resolves preload script path')
}
if (!mainSource.includes('veil-media')) {
  console.error('MISSING: veil-media protocol in main bundle')
  failed = true
} else {
  console.log('OK: veil-media protocol registered in main')
}

const preloadPath = join(root, 'out/preload/index.js')
const preloadSource = readFileSync(preloadPath, 'utf8')
if (/^\s*import\s/m.test(preloadSource)) {
  console.error('MISSING: preload must be CommonJS (no top-level import) for sandboxed preload')
  failed = true
} else {
  console.log('OK: preload is CommonJS (sandbox-safe)')
}
for (const api of ['openVideoDialog', 'saveTrackJson', 'loadTrackJson', 'veilLauncher']) {
  if (!preloadSource.includes(api)) {
    console.error(`MISSING: preload API ${api}`)
    failed = true
  } else {
    console.log(`OK: preload API ${api}`)
  }
}

const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const version = packageJson.version ?? '0.0.0'

const releaseDir = join(root, 'release')
let portablePath = null
const portableDirs = [releaseDir]

for (const name of readdirSync(root)) {
  if (name.startsWith('release-') && existsSync(join(root, name))) {
    portableDirs.push(join(root, name))
  }
}

for (const dir of portableDirs) {
  if (!existsSync(dir)) {
    continue
  }
  const portableFiles = readdirSync(dir).filter(
    (name) => name.endsWith('-portable.exe') && name.includes('VEIL')
  )
  const preferred = portableFiles.find((name) => name.includes(version)) ?? portableFiles[0]
  if (preferred) {
    portablePath = join(dir, preferred)
    const rel = portablePath.replace(root + '\\', '').replace(root + '/', '')
    const sizeMb = (statSync(portablePath).size / (1024 * 1024)).toFixed(1)
    console.log(`OK: ${rel} (${sizeMb} MB)`)
    break
  }
}

if (!portablePath) {
  console.error('MISSING: portable EXE in release/ or release-*/')
  failed = true
}

const unpackedRoots = [
  join(root, 'release/win-unpacked'),
  ...readdirSync(root)
    .filter((name) => name.startsWith('release-'))
    .map((name) => join(root, name, 'win-unpacked'))
    .filter((path) => existsSync(path))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
]

let unpackedVerified = false
for (const unpackedRoot of unpackedRoots) {
  const unpackedExe = ['VEIL Player.exe', 'VEIL.exe']
    .map((name) => join(unpackedRoot, name))
    .find((path) => existsSync(path))
  if (!unpackedExe) {
    continue
  }

  const relRoot = unpackedRoot.replace(root + '\\', '').replace(root + '/', '')
  console.log(`OK: ${unpackedExe.replace(root + '\\', '').replace(root + '/', '')}`)
  const unpackedPreload = join(unpackedRoot, 'resources/app.asar.unpacked/out/preload/index.js')
  if (!existsSync(unpackedPreload)) {
    console.error(`MISSING: unpacked preload at ${relRoot}/resources/app.asar.unpacked/out/preload/index.js`)
    failed = true
    continue
  }

  console.log(`OK: unpacked preload index.js (${relRoot})`)
  const unpackedPreloadSource = readFileSync(unpackedPreload, 'utf8')
  if (/^\s*import\s/m.test(unpackedPreloadSource)) {
    console.error('MISSING: unpacked preload must be CommonJS for sandboxed preload')
    failed = true
  } else {
    unpackedVerified = true
    break
  }
}

if (!unpackedVerified) {
  console.warn('WARN: no win-unpacked build with sandbox-safe unpacked preload found')
}

process.exit(failed ? 1 : 0)

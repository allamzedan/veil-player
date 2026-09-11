# Third-party notices

This document is an informative inventory for VEIL Player Desktop source and future binary-distribution preparation. It does not replace upstream license texts. Versions reflect `package-lock.json` in this source candidate.

## Direct runtime dependencies

| Package | Version | License | Source |
| --- | ---: | --- | --- |
| react | 19.2.6 | MIT | https://www.npmjs.com/package/react |
| react-dom | 19.2.6 | MIT | https://www.npmjs.com/package/react-dom |
| zod | 3.25.76 | MIT | https://www.npmjs.com/package/zod |
| zustand | 5.0.13 | MIT | https://www.npmjs.com/package/zustand |

## Direct development and packaging dependencies

| Package | Version | License |
| --- | ---: | --- |
| @types/node | 22.19.19 | MIT |
| @types/react | 19.2.14 | MIT |
| @types/react-dom | 19.2.3 | MIT |
| @vitejs/plugin-react | 4.7.0 | MIT |
| electron | 42.11.3 | MIT |
| electron-builder | 26.15.3 | MIT |
| electron-vite | 3.1.0 | MIT |
| postcss | 8.5.23 | MIT |
| typescript | 5.9.3 | Apache-2.0 |
| vite | 6.4.3 | MIT |
| vitest | 3.2.6 | MIT |

The complete locked dependency graph also contains permissive and attribution licenses including Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, BlueOak-1.0.0, CC-BY-4.0, Python-2.0, CC0/MIT alternatives, and WTFPL alternatives. Consult each installed package's license and the lockfile before redistribution.

## Packaged Electron distributions

Electron packages Chromium, Node.js, FFmpeg, V8, ANGLE and other third-party components. A binary release must include the exact Electron `LICENSE` and `LICENSES.chromium.html` files produced with that build, plus any other notices required by the packaging toolchain. This inventory does not replace those bundled files.

No Electron executable, DLL, PAK, locale pack, installer, portable executable, `ffmpeg.dll`, or `elevate.exe` is included in this source repository. Binary-distribution licensing and provider compliance must be reviewed against the exact release artifact before publication.

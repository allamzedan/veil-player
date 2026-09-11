const port = Number(process.argv[2] ?? 9499)

async function rendererTarget() {
  const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json())
  return targets.find((target) => target.type === 'page' && /:\d+\/$/.test(target.url))
}

async function evaluate(expression) {
  const target = await rendererTarget()
  if (!target) throw new Error('VEIL renderer target not found')
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.onopen = resolve
    socket.onerror = reject
  })
  const result = await new Promise((resolve, reject) => {
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.id !== 1) return
      if (message.error) reject(new Error(message.error.message))
      else resolve(message.result)
    }
    socket.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: { expression, returnByValue: true, awaitPromise: true }
    }))
  })
  socket.close()
  return result.result?.value
}

const outcome = await evaluate(`(async () => {
  const marker = document.querySelector('.timeline-bookmark-marker--selected')
  const timeline = document.querySelector('.timeline-editor')
  const modal = document.querySelector('.modal')
  const backdrop = document.querySelector('.modal__backdrop')
  const panel = document.querySelector('.modal__panel--settings')
  const closeButton = panel?.querySelector('.modal__footer button')
  const aboutButton = [...document.querySelectorAll('.settings-dialog__nav-item')]
    .find((button) => button.textContent?.trim() === 'About')
  aboutButton?.click()
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => requestAnimationFrame(resolve))

  if (!marker || !timeline || !modal || !backdrop || !panel || !aboutButton || !closeButton) {
    return { ok: false, reason: 'Expected selected marker and open Settings dialog are required' }
  }

  const markerRect = marker.getBoundingClientRect()
  const x = Math.round(markerRect.left + markerRect.width / 2)
  const y = Math.round(markerRect.top + markerRect.height / 2)
  const stack = document.elementsFromPoint(x, y)
  const markerIndex = stack.indexOf(marker)
  const modalIndex = stack.findIndex((element) =>
    element === panel || element === backdrop || element === modal
  )

  const parseRgb = (value) => {
    const channels = (value.match(/[\\d.]+/g) ?? []).slice(0, 3).map(Number)
    return value.startsWith('color(srgb') ? channels.map((channel) => channel * 255) : channels
  }
  const luminance = (value) => {
    const [r, g, b] = parseRgb(value).map((channel) => {
      const normalized = channel / 255
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  const contrast = (foreground, background) => {
    const first = luminance(foreground)
    const second = luminance(background)
    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
  }
  const background = getComputedStyle(panel).backgroundColor
  const text = Object.fromEntries([
    ['description', '.settings-dialog__about-description'],
    ['meta', '.settings-dialog__about-meta'],
    ['developer', '.settings-dialog__about-developer']
  ].map(([name, selector]) => {
    const element = document.querySelector(selector)
    const style = element && getComputedStyle(element)
    return [name, style ? {
      color: style.color,
      opacity: style.opacity,
      contrast: contrast(style.color, background)
    } : null]
  }))

  const markerOccluded = modalIndex >= 0 && (markerIndex < 0 || modalIndex < markerIndex)
  const readable = Object.values(text).every((entry) =>
    entry && entry.opacity === '1' && entry.contrast >= 7
  )

  closeButton.click()
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await new Promise((resolve) => requestAnimationFrame(resolve))
  const postCloseStack = document.elementsFromPoint(x, y)
  const markerStyle = getComputedStyle(marker)
  const markerRestored =
    !document.querySelector('.modal__panel--settings') &&
    postCloseStack.includes(marker) &&
    markerStyle.visibility === 'visible' &&
    markerStyle.opacity !== '0'

  return {
    ok: markerOccluded && markerRestored && readable && getComputedStyle(timeline).isolation === 'isolate',
    marker: {
      inlineZIndex: marker.style.zIndex,
      computedZIndex: getComputedStyle(marker).zIndex,
      timelineIsolation: getComputedStyle(timeline).isolation,
      topAtMarker: stack[0]?.className ?? stack[0]?.tagName,
      markerIndex,
      modalIndex,
      occluded: markerOccluded
    },
    close: {
      modalClosed: !document.querySelector('.modal__panel--settings'),
      markerRestored,
      topAtMarker: postCloseStack[0]?.className ?? postCloseStack[0]?.tagName
    },
    about: { background, ...text, readable }
  }
})()`)

console.log(JSON.stringify(outcome, null, 2))
if (!outcome?.ok) process.exitCode = 1

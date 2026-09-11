const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const output = path.resolve(process.argv[2] || 'tmp-ui-verify/phase10d1-synthetic.webm')
const durationSeconds = 12

app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, webPreferences: { backgroundThrottling: false } })
  await window.loadURL('data:text/html,<canvas id="c" width="640" height="360"></canvas>')
  const base64 = await window.webContents.executeJavaScript(`(async () => {
    const canvas = document.getElementById('c')
    const context = canvas.getContext('2d')
    const audio = new AudioContext()
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    const destination = audio.createMediaStreamDestination()
    oscillator.frequency.value = 440
    gain.gain.value = 0.04
    oscillator.connect(gain).connect(destination)
    oscillator.start()
    const stream = canvas.captureStream(30)
    stream.addTrack(destination.stream.getAudioTracks()[0])
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' })
    const chunks = []
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
    const stopped = new Promise(resolve => recorder.onstop = resolve)
    const start = performance.now()
    const draw = () => {
      const elapsed = (performance.now() - start) / 1000
      context.fillStyle = elapsed % 2 < 1 ? '#151a24' : '#25304a'
      context.fillRect(0, 0, 640, 360)
      context.fillStyle = '#f2f4f8'
      context.font = '48px sans-serif'
      context.fillText('VEIL TEST', 180, 155)
      context.font = '36px monospace'
      context.fillText(elapsed.toFixed(2) + ' s', 230, 220)
      if (elapsed < ${durationSeconds}) requestAnimationFrame(draw)
    }
    recorder.start(250)
    draw()
    await new Promise(resolve => setTimeout(resolve, ${durationSeconds * 1000}))
    recorder.stop(); oscillator.stop(); await stopped; await audio.close()
    const bytes = new Uint8Array(await new Blob(chunks, { type: recorder.mimeType }).arrayBuffer())
    let binary = ''
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    return btoa(binary)
  })()`)
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, Buffer.from(base64, 'base64'))
  console.log(JSON.stringify({ output, durationSeconds, bytes: fs.statSync(output).size }))
  window.destroy()
  app.quit()
}).catch(error => { console.error(error); app.exit(1) })

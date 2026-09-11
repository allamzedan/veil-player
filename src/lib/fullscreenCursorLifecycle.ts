export function shouldHideFullscreenCursor(input: {
  fullscreen: boolean
  interactiveOverlayOpen: boolean
  controlsEngaged: boolean
}): boolean {
  return input.fullscreen && !input.interactiveOverlayOpen && !input.controlsEngaged
}

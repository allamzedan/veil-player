/** True when a VEIL modal dialog is open (blocks global shortcuts). */
export function isModalActive(): boolean {
  if (typeof document === 'undefined') {
    return false
  }
  return (
    document.querySelector('.modal') !== null ||
    document.querySelector('.matching-veil-dialog') !== null
  )
}

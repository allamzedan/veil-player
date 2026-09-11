export function isHomeWorkspaceInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false
  }

  return Boolean(
    target.closest(
      'button, a, input, textarea, select, label, [data-home-interactive], [role="menu"], [role="menuitem"]'
    )
  )
}

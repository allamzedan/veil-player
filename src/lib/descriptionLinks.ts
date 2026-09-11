export type DescriptionToken =
  | { kind: 'text'; value: string }
  | { kind: 'link'; value: string }

const HTTPS_URL = /https:\/\/[^\s<>"']+/giu

export function tokenizeDescription(description: string): DescriptionToken[] {
  const tokens: DescriptionToken[] = []
  let cursor = 0
  for (const match of description.matchAll(HTTPS_URL)) {
    const index = match.index ?? 0
    if (index > cursor) tokens.push({ kind: 'text', value: description.slice(cursor, index) })
    let url = match[0]
    let suffix = ''
    while (/[),.;!?]$/u.test(url)) {
      suffix = url.slice(-1) + suffix
      url = url.slice(0, -1)
    }
    tokens.push({ kind: 'link', value: url })
    if (suffix) tokens.push({ kind: 'text', value: suffix })
    cursor = index + match[0].length
  }
  if (cursor < description.length) tokens.push({ kind: 'text', value: description.slice(cursor) })
  return tokens
}

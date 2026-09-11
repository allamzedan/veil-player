export interface VeilItemSearchRow {
  type: string
  item: {
    label?: string
    notes?: string
  }
}

export function normalizeVeilItemSearchQuery(query: string): string {
  return query.trim().normalize('NFC').toLocaleLowerCase()
}

export function filterNavigationItemsByQuery<T extends VeilItemSearchRow>(
  items: readonly T[],
  query: string
): T[] {
  const normalizedQuery = normalizeVeilItemSearchQuery(query)
  if (!normalizedQuery) return [...items]

  return items.filter((row) => {
    const searchable = `${row.item.label ?? ''}\n${row.item.notes ?? ''}`
      .normalize('NFC')
      .toLocaleLowerCase()
    return searchable.includes(normalizedQuery)
  })
}

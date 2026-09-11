import { formatSeconds } from '../lib/time'
import { sortNavigationItems, type ChapterNavigationItem } from '../lib/bookmarkNavigation'

export default function ChapterNavigationList({
  chapters,
  onSeek
}: {
  chapters: readonly ChapterNavigationItem[]
  onSeek: (time: number) => void
}) {
  if (chapters.length === 0) return null
  return (
    <section className="chapter-navigation" aria-label="Chapters">
      <h3 className="navigate-group-title">Chapters</h3>
      <ul className="bookmark-navigation__list">
        {sortNavigationItems(chapters).map((chapter) => (
          <li key={chapter.id} className="bookmark-navigation__item">
            <button
              type="button"
              className="bookmark-navigation__row"
              onClick={() => onSeek(chapter.start)}
              title={chapter.description || chapter.title}
            >
              <span className="bookmark-navigation__timestamp ltr-digits">{formatSeconds(chapter.start)}</span>
              <span className="bookmark-navigation__text">
                <strong>{chapter.title}</strong>
                <small>{chapter.source === 'youtube' ? 'YouTube chapter' : 'VEIL chapter'}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

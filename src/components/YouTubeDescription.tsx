import { tokenizeDescription } from '../lib/descriptionLinks'

export default function YouTubeDescription({
  text,
  expanded,
  onActivateLink
}: {
  text: string
  expanded: boolean
  onActivateLink: (url: string) => void
}) {
  return (
    <div className={`youtube-description__text${expanded ? ' youtube-description__text--expanded' : ''}`} dir="auto">
      {tokenizeDescription(text).map((token, index) =>
        token.kind === 'link' ? (
          <button
            key={`${index}:${token.value}`}
            type="button"
            className="youtube-description__link"
            onClick={() => onActivateLink(token.value)}
          >
            {token.value}
          </button>
        ) : <span key={index}>{token.value}</span>
      )}
    </div>
  )
}

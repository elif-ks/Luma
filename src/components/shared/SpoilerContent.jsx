import { useEffect, useState } from 'react'

function SpoilerBody({ children, className }) {
  const isTextContent = typeof children === 'string' || typeof children === 'number'

  return isTextContent
    ? <p className={className}>{children}</p>
    : <div className={className}>{children}</div>
}

export function SpoilerContent({ id, spoiler, children, warning = 'Bu içerik spoiler içeriyor.' }) {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setRevealed(false)
  }, [id, spoiler])

  if (!spoiler) return <SpoilerBody>{children}</SpoilerBody>

  return <div className={`spoiler-content${revealed ? ' revealed' : ''}`}>
    {!revealed
      ? <p className="spoiler-content-warning">{warning}</p>
      : <SpoilerBody className="spoiler-content-text">{children}</SpoilerBody>}
    <button
      type="button"
      className="spoiler-content-toggle"
      aria-expanded={revealed}
      onClick={() => setRevealed((current) => !current)}
    >
      {revealed ? 'Spoileri gizle' : 'Spoileri göster'}
    </button>
  </div>
}

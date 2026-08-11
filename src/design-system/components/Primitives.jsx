export function MovieCard({ title, subtitle, accent = 'linear-gradient(135deg, #ff5e7d, #ff8a4c)' }) {
  return (
    <article className="ds-movie-card">
      <div className="ds-movie-poster" style={{ background: accent }} />
      <div className="ds-movie-content">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <span className="ds-badge ds-badge-soft">Hot</span>
      </div>
    </article>
  )
}

export function ProfileAvatar({ name, size = 'md', accent = 'linear-gradient(135deg, #b66cff, #ff8a4c)' }) {
  return (
    <div className={`ds-avatar ds-avatar-${size}`} style={{ background: accent }}>
      {name ? name.charAt(0).toUpperCase() : 'U'}
    </div>
  )
}

export function Badge({ children, variant = 'default' }) {
  return <span className={`ds-badge ds-badge-${variant}`}>{children}</span>
}

export function Tag({ children }) {
  return <span className="ds-tag">{children}</span>
}

export function SearchInput({ placeholder = 'Search' }) {
  return (
    <label className="ds-search-input">
      <span>⌕</span>
      <input placeholder={placeholder} />
    </label>
  )
}

export function SectionTitle({ eyebrow, title, action }) {
  return (
    <div className="ds-section-title">
      <div>
        {eyebrow ? <p className="ds-eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
      </div>
      {action ? <div className="ds-section-action">{action}</div> : null}
    </div>
  )
}

export function GlassCard({ children, className = '' }) {
  return <div className={`ds-glass-card ${className}`.trim()}>{children}</div>
}

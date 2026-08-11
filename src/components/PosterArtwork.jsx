export function PosterArtwork({ title, palette, variant = 'default' }) {
  const colors = palette || {
    base: '#151520',
    accent: '#ff5e7d',
    accent2: '#ff8a4c',
    glow: '#b66cff',
    text: '#f7f5ff'
  }

  const decorations = {
    default: (
      <>
        <div className="poster-ring" style={{ background: `radial-gradient(circle, ${colors.glow} 0%, transparent 72%)` }} />
        <div className="poster-sun" style={{ background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent2})` }} />
        <div className="poster-shape" style={{ background: `linear-gradient(145deg, ${colors.base}, ${colors.glow})` }} />
      </>
    ),
    noir: (
      <>
        <div className="poster-line" style={{ background: `linear-gradient(90deg, transparent, ${colors.text}, transparent)` }} />
        <div className="poster-arc" style={{ borderColor: colors.accent2 }} />
        <div className="poster-spark" style={{ background: colors.accent }} />
      </>
    ),
    dusk: (
      <>
        <div className="poster-halo" style={{ background: `radial-gradient(circle, ${colors.accent2} 0%, transparent 72%)` }} />
        <div className="poster-bloom" style={{ background: `linear-gradient(145deg, ${colors.base}, ${colors.glow})` }} />
      </>
    )
  }

  return (
    <div className={`poster-artwork poster-${variant}`} style={{ background: `linear-gradient(135deg, ${colors.base}, ${colors.accent} 45%, ${colors.glow})` }}>
      <div className="poster-overlay" />
      <div className="poster-topbar" />
      {decorations[variant] || decorations.default}
      <div className="poster-title-block">
        <span>{title}</span>
      </div>
    </div>
  )
}

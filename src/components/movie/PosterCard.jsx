export function PosterCard({ title, year, rating, accent }) {
  return (
    <article className="poster-card-item">
      <div className="poster-card-visual" style={{ background: accent }} />
      <div className="poster-card-bottom">
        <h3>{title}</h3>
        <p>{year}</p>
        <span>⭐ {rating}</span>
      </div>
    </article>
  )
}

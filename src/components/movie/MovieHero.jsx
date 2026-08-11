import { PrimaryButton, SecondaryButton, Badge, GlassCard } from '../../design-system'

export function MovieHero({ movie }) {
  return (
    <GlassCard className="movie-hero-card">
      <div className="movie-hero-backdrop" />
      <div className="movie-hero-main">
        <div className="movie-poster-shell">
          <div className="movie-poster-visual" />
        </div>
        <div className="movie-hero-content">
          <div className="movie-hero-title-row">
            <div>
              <p className="movie-eyebrow">Sinema keşfi</p>
              <h1>{movie.title}</h1>
              <p>{movie.originalTitle}</p>
            </div>
            <Badge variant="accent">{movie.communityScore}</Badge>
          </div>
          <div className="movie-meta-row">
            <span>{movie.year}</span>
            <span>{movie.runtime}</span>
            <span>{movie.ageRating}</span>
          </div>
          <div className="movie-chip-row">
            {movie.genres.map((genre) => (
              <span key={genre}>{genre}</span>
            ))}
          </div>
          <div className="movie-rating-row">
            <div className="stat-pill"><strong>IMDb</strong><span>{movie.imdbRating}</span></div>
            <div className="stat-pill"><strong>Luma</strong><span>{movie.lumaRating}</span></div>
          </div>
          <div className="movie-stats-row">
            <div><strong>{movie.watched}</strong><span>İzlenen</span></div>
            <div><strong>{movie.favorites}</strong><span>Favori</span></div>
            <div><strong>{movie.reviews}</strong><span>Yorum</span></div>
            <div><strong>{movie.lists}</strong><span>Liste</span></div>
          </div>
          <div className="movie-action-row">
            <PrimaryButton>🎬 Fragmanı İzle</PrimaryButton>
            <SecondaryButton>+ İzleme Listesi</SecondaryButton>
            <SecondaryButton>★ Favori</SecondaryButton>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}

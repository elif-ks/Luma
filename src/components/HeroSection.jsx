import { getTmdbBackdropUrl, getTmdbImageUrl, formatRating, toYear } from '../services/tmdbHelpers'
import { PosterArtwork } from './PosterArtwork'
import { Link } from 'react-router-dom'

export function HeroSection({ movie }) {
  if (!movie) return null

  return (
    <section className="hero-section">
      <div className="hero-backdrop" style={{ backgroundImage: `url(${getTmdbBackdropUrl(movie.backdrop_path)})` }} />
      <div className="hero-content">
        <div className="hero-copy">
          <p className="eyebrow">Trend film</p>
          <h1>{movie.title}</h1>
          <p className="hero-description">{movie.overview || 'Bu hafta popüler olan film.'}</p>
          <div className="hero-tags">
            <span>{toYear(movie.release_date)}</span>
            <span>⭐ {formatRating(movie.vote_average)}</span>
            <span>{movie.vote_count} oy</span>
          </div>
          <div className="hero-actions">
            <Link className="primary-btn" to={`/movie/${movie.id}`}>Detayları gör</Link>
            <Link className="secondary-btn" to="/discover?section=trending">Keşfet</Link>
          </div>
        </div>

        <div className="hero-stack">
          <div className="poster-card large">
            <img src={getTmdbImageUrl(movie.poster_path)} alt={movie.title} className="tmdb-poster" />
          </div>
        </div>
      </div>
    </section>
  )
}

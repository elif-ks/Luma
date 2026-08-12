import { Link } from 'react-router-dom'
import { getTmdbImageUrl, formatRating, toYear } from '../services/tmdbHelpers'

export function MovieGrid({ movies }) {
  return (
    <section className="card-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Öne çıkanlar</p>
          <h2>Bu Hafta Akışta</h2>
        </div>
        <Link to="/discover?section=trending">Tümünü gör</Link>
      </div>

      <div className="movie-grid">
        {movies.map((movie) => (
          <article key={movie.id} className="movie-card">
            <div className="movie-poster">
              <Link to={`/movie/${movie.id}`} className="movie-poster-link" aria-label={`View ${movie.title}`}>
                <img src={getTmdbImageUrl(movie.poster_path)} alt={movie.title} className="tmdb-poster" />
              </Link>
            </div>
            <div className="movie-meta">
              <div>
                <Link to={`/movie/${movie.id}`} className="movie-title-link">
                  <h3>{movie.title}</h3>
                </Link>
                <p>{toYear(movie.release_date)}</p>
              </div>
              <div className="movie-badge">Trend</div>
            </div>
            <div className="movie-footer">
              <span>⭐ {formatRating(movie.vote_average)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

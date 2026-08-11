export function MovieListGrid({ movies }) {
  return (
    <div className="movie-list-grid">
      {movies.map((movie) => (
        <div key={movie.title} className="movie-list-item">
          <div className="review-card-visual" style={{ background: movie.cover }} />
          <div>
            <h3>{movie.title}</h3>
            <p>{movie.year}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

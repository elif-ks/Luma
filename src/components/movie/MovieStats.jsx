export function MovieStats({ movie }) {
  return (
    <div className="movie-stats-grid">
      <div>
        <strong>{movie.watched}</strong>
        <span>İzlenen</span>
      </div>
      <div>
        <strong>{movie.favorites}</strong>
        <span>Favori</span>
      </div>
      <div>
        <strong>{movie.reviews}</strong>
        <span>Yorum</span>
      </div>
      <div>
        <strong>{movie.lists}</strong>
        <span>Liste</span>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { formatRating, getTmdbImageUrl, toYear } from '../../services/tmdbHelpers'

export function MediaCard({ item, mediaType, reason }) {
  const type = mediaType || item.media_type || (item.name ? 'tv' : 'movie')
  const title = item.title || item.name || item.original_title || item.original_name || 'İsimsiz yapım'
  const date = item.release_date || item.first_air_date
  const poster = getTmdbImageUrl(item.poster_path, 'w342')
  return <Link to={`/${type}/${item.id}`} className="media-card">
    <div className="media-card-poster">{poster ? <img src={poster} alt={`${title} posteri`} loading="lazy" /> : <span>Luma</span>}</div>
    <div className="media-card-copy"><h3>{title}</h3><div className="media-card-meta"><span>{toYear(date)} · {type === 'tv' ? 'Dizi' : 'Film'}</span><span>⭐ {formatRating(item.vote_average)}</span></div>{reason ? <p className="media-card-reason">{reason}</p> : null}</div>
  </Link>
}

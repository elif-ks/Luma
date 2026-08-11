import { Link } from 'react-router-dom'
import { getTmdbImageUrl } from '../../services/tmdbHelpers'
import { UserAvatar } from '../shared/UserAvatar'
import { ContentLikeButton } from '../shared/ContentLikeButton'
import { SafetyMenu } from '../safety/SafetyMenu'

function formatDate(timestamp) {
  const date = typeof timestamp?.toDate === 'function' ? timestamp.toDate() : null
  return date ? date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Şimdi'
}

export function ReviewCard({ review }) {
  const author = review.authorProfile?.username || 'Luma kullanıcısı'
  const poster = getTmdbImageUrl(review.posterPath, 'w342')
  const preview = review.spoiler ? 'Bu yorum spoiler içeriyor. Detay sayfasında görüntüleyebilirsin.' : review.content

  return (
    <article className="review-card-item">
      <div className="review-card-visual review-list-poster">
        {poster ? <img src={poster} alt={`${review.title} posteri`} loading="lazy" /> : <span>Luma</span>}
      </div>
      <div className="review-card-body">
        <SafetyMenu targetUid={review.uid} targetType="review" targetId={review.id} compact />
        <div className="review-card-meta"><span>{review.title}</span><span>⭐ {review.rating}/5</span></div>
        <Link to={`/reviews/${review.id}`} className="review-title-link"><h3>{review.title} yorumu</h3></Link>
        <p>{preview.length > 180 ? `${preview.slice(0, 180)}…` : preview}</p>
        <div className="review-card-footer">
          <Link to={`/profile/${encodeURIComponent(author)}`} className="review-card-author"><UserAvatar profile={review.authorProfile} name={author} size={26} />{author}</Link>
          <span>{review.mediaType === 'tv' ? 'Dizi' : 'Film'}</span>
          <span>{formatDate(review.createdAt)}</span>
          <ContentLikeButton type="review" contentId={review.id} />
        </div>
      </div>
    </article>
  )
}

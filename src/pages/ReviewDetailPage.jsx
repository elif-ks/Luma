import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { attachReviewProfiles, deleteReview, getReviewById, saveReview } from '../services/reviews'
import { getTmdbImageUrl, toYear } from '../services/tmdbHelpers'
import { UserAvatar } from '../components/shared/UserAvatar'
import { LoadingSkeleton } from '../components/shared/LoadingSkeleton'
import { ErrorState } from '../components/shared/ErrorState'
import { EmptyState } from '../components/shared/EmptyState'
import { ContentLikeButton } from '../components/shared/ContentLikeButton'
import { SafetyMenu } from '../components/safety/SafetyMenu'

export function ReviewDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [review, setReview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [spoiler, setSpoiler] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    getReviewById(id).then(async (item) => {
      if (!item) return null
      const [enriched] = await attachReviewProfiles([item])
      return enriched
    }).then((item) => {
      if (active) { setReview(item); setLoading(false) }
    }).catch((loadError) => {
      if (active) { setError(loadError.message || 'Yorum yüklenemedi.'); setLoading(false) }
    })
    return () => { active = false }
  }, [id])

  const startEditing = () => {
    setRating(review.rating); setContent(review.content); setSpoiler(review.spoiler); setEditing(true); setActionError('')
  }

  const handleUpdate = async (event) => {
    event.preventDefault()
    const length = Array.from(content.trim()).length
    if (!rating || length < 10 || length > 2000) { setActionError('Puan seçin ve 10–2000 karakter arasında bir yorum yazın.'); return }
    setSaving(true); setActionError('')
    try {
      await saveReview({ ...review, rating, content, spoiler })
      setReview({ ...review, rating, content: content.trim(), spoiler })
      setEditing(false)
    } catch (updateError) { setActionError(updateError.message) } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!window.confirm('Yorumunu silmek istediğine emin misin?')) return
    setSaving(true)
    try { await deleteReview(review.uid, review.mediaType, review.mediaId); navigate('/reviews', { replace: true }) }
    catch (deleteError) { setActionError(deleteError.message); setSaving(false) }
  }

  if (loading) return <LoadingSkeleton rows={2} />
  if (error) return <ErrorState message={error} />
  if (!review) return <EmptyState title="Yorum bulunamadı" message="Bu yorum silinmiş veya mevcut olmayabilir." />

  const author = review.authorProfile?.username || 'Luma kullanıcısı'
  const poster = getTmdbImageUrl(review.posterPath, 'w500')
  const ownReview = review.uid === user?.uid
  const mediaPath = `/${review.mediaType}/${review.mediaId}`
  const mediaLabel = review.mediaType === 'tv' ? 'Dizi' : 'Film'
  const releaseYear = toYear(review.releaseDate)

  return (
    <article className="review-article-card real-review-detail">
      <div className="review-detail-poster-wrap"><Link to={mediaPath} aria-label={`${review.title} detayını aç`}>{poster ? <img className="review-detail-poster" src={poster} alt={`${review.title} posteri`} /> : <span className="review-detail-poster-fallback">Luma</span>}</Link></div>
      <div className="review-article-body review-detail-content-column">
        <SafetyMenu targetUid={review.uid} targetType="review" targetId={review.id} compact />
        <p className="eyebrow">{mediaLabel} yorumu</p>
        <h1><Link to={mediaPath} className="review-title-link">{review.title}</Link></h1>
        <p className="review-detail-media-meta">{releaseYear ? `${releaseYear} · ` : ''}{mediaLabel}</p>
        <p className="review-article-meta review-detail-author"><Link to={`/profile/${encodeURIComponent(author)}`}><UserAvatar profile={review.authorProfile} name={author} size={30} />{author}</Link> · ⭐ {review.rating}/5</p>
        <ContentLikeButton type="review" contentId={review.id} className="content-like-detail" />
        {editing ? (
          <form className="review-detail-edit" onSubmit={handleUpdate}>
            <label>Puan <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>{[1,2,3,4,5].map((value) => <option key={value} value={value}>{value} yıldız</option>)}</select></label>
            <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} disabled={saving} />
            <label><input type="checkbox" checked={spoiler} onChange={(event) => setSpoiler(event.target.checked)} /> Spoiler içeriyor</label>
            <div className="review-form-actions"><button className="primary-btn" disabled={saving}>Kaydet</button><button type="button" className="secondary-btn" onClick={() => setEditing(false)} disabled={saving}>Vazgeç</button></div>
          </form>
        ) : review.spoiler && !revealed ? (
          <button className="spoiler-reveal-btn" onClick={() => setRevealed(true)}>Spoiler yorumunu göster</button>
        ) : <p className="review-detail-content">{review.content}</p>}
        {actionError ? <p className="auth-message auth-message-error">{actionError}</p> : null}
        {ownReview && !editing ? <div className="review-form-actions"><button className="primary-btn" onClick={startEditing}>Düzenle</button><button className="secondary-btn" onClick={handleDelete} disabled={saving}>Sil</button></div> : null}
        <Link to="/reviews" className="review-title-link">← İncelemelere dön</Link>
      </div>
    </article>
  )
}

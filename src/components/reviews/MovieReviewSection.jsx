import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { attachReviewProfiles, deleteReview, saveReview, subscribeToMediaReviews } from '../../services/reviews'
import { EmptyState } from '../shared/EmptyState'
import { ErrorState } from '../shared/ErrorState'
import { GlassCard } from '../../design-system'
import { UserAvatar } from '../shared/UserAvatar'
import { ContentLikeButton } from '../shared/ContentLikeButton'

function formatReviewDate(timestamp) {
  const date = typeof timestamp?.toDate === 'function' ? timestamp.toDate() : null
  return date ? date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Şimdi'
}

export function MovieReviewSection({ movie, mediaType = 'movie' }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const starRefs = useRef([])
  const formRef = useRef(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [retryKey, setRetryKey] = useState(0)
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [spoiler, setSpoiler] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [revealedSpoilers, setRevealedSpoilers] = useState(() => new Set())

  const ownReview = useMemo(() => reviews.find((review) => review.uid === user?.uid) || null, [reviews, user?.uid])

  useEffect(() => {
    setLoading(true)
    setLoadError('')
    let active = true

    const unsubscribe = subscribeToMediaReviews(mediaType, movie.id, async (items) => {
      try {
        const enriched = await attachReviewProfiles(items)
        if (active) setReviews(enriched)
      } catch {
        if (active) setReviews(items)
      } finally {
        if (active) setLoading(false)
      }
    }, (error) => {
      if (active) {
        setLoadError(error.message || 'Yorumlar yüklenemedi.')
        setLoading(false)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [mediaType, movie.id, retryKey])

  useEffect(() => {
    if (ownReview) {
      setRating(ownReview.rating)
      setContent(ownReview.content)
      setSpoiler(ownReview.spoiler)
    } else {
      setRating(0)
      setContent('')
      setSpoiler(false)
    }
  }, [ownReview?.id, ownReview?.updatedAt?.seconds])

  const requireLogin = () => {
    if (user) return true
    navigate('/login', { state: { from: `${location.pathname}${location.search}` } })
    return false
  }

  const selectRating = (value) => {
    if (!requireLogin()) return
    setRating(value)
    setFormError('')
  }

  const handleStarKeyDown = (event, value) => {
    let nextValue = value
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') nextValue = value === 5 ? 1 : value + 1
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') nextValue = value === 1 ? 5 : value - 1
    if (nextValue !== value) {
      event.preventDefault()
      selectRating(nextValue)
      starRefs.current[nextValue - 1]?.focus()
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!requireLogin()) return
    setFormError('')
    setSuccessMessage('')

    if (!rating) {
      setFormError('Lütfen 1–5 arasında bir puan seçin.')
      return
    }
    const length = Array.from(content.trim()).length
    if (length < 10 || length > 2000) {
      setFormError('Yorum 10–2000 karakter arasında olmalı.')
      return
    }

    setSaving(true)
    try {
      const result = await saveReview({
        uid: user.uid,
        mediaId: movie.id,
        mediaType,
        title: movie.title || movie.name,
        posterPath: movie.poster_path || '',
        releaseDate: movie.release_date || movie.first_air_date || '',
        rating,
        content,
        spoiler
      })
      setSuccessMessage(result.activityWarning || (ownReview ? 'Yorumun güncellendi.' : 'Yorumun yayınlandı.'))
    } catch (error) {
      setFormError(error.message || 'Yorum kaydedilemedi.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!ownReview || !window.confirm('Yorumunu silmek istediğine emin misin?')) return
    setSaving(true)
    setFormError('')
    try {
      await deleteReview(user.uid, mediaType, movie.id)
      setSuccessMessage('Yorumun silindi.')
    } catch (error) {
      setFormError(error.message || 'Yorum silinemedi.')
    } finally {
      setSaving(false)
    }
  }

  const editOwnReview = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <section className="movie-reviews-section">
      <GlassCard className="movie-review-composer">
        <div className="section-header">
          <h2>Puanla ve yorumla</h2>
          {ownReview ? <span className="review-owner-badge">Yorumun mevcut</span> : null}
        </div>
        <form ref={formRef} onSubmit={handleSubmit} className="movie-review-form">
          <div className="review-stars" role="radiogroup" aria-label="Film puanı">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                ref={(element) => { starRefs.current[value - 1] = element }}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} yıldız`}
                tabIndex={rating === value || (!rating && value === 1) ? 0 : -1}
                className={value <= rating ? 'active' : ''}
                onClick={() => selectRating(value)}
                onKeyDown={(event) => handleStarKeyDown(event, value)}
                disabled={saving}
              >★</button>
            ))}
          </div>
          <label className="review-content-field">
            <span>Yorumun</span>
            <textarea
              value={content}
              onFocus={() => { if (!user) requireLogin() }}
              onChange={(event) => { setContent(event.target.value); setFormError('') }}
              placeholder="Film hakkında ne düşünüyorsun?"
              maxLength={2000}
              disabled={saving}
            />
            <small>{Array.from(content).length}/2000</small>
          </label>
          <label className="review-spoiler-check">
            <input type="checkbox" checked={spoiler} onFocus={() => { if (!user) requireLogin() }} onChange={(event) => setSpoiler(event.target.checked)} disabled={saving} />
            <span>Spoiler içeriyor</span>
          </label>
          {formError ? <p className="auth-message auth-message-error">{formError}</p> : null}
          {successMessage ? <p className="auth-message auth-message-success">{successMessage}</p> : null}
          <div className="review-form-actions">
            <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Kaydediliyor…' : ownReview ? 'Yorumu güncelle' : 'Yorumu yayınla'}</button>
            {ownReview ? <button type="button" className="secondary-btn" onClick={handleDelete} disabled={saving}>Yorumu sil</button> : null}
          </div>
        </form>
      </GlassCard>

      <GlassCard className="movie-review-list-card">
        <div className="section-header"><h2>Film yorumları</h2><span>{reviews.length}</span></div>
        {loading ? (
          <div className="review-list-skeleton"><span className="skeleton-card" /><span className="skeleton-card" /></div>
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={() => setRetryKey((value) => value + 1)} />
        ) : reviews.length ? (
          <div className="live-review-list">
            {reviews.map((review) => {
              const authorName = review.authorProfile?.username || 'Luma kullanıcısı'
              const hidden = review.spoiler && !revealedSpoilers.has(review.id)
              return (
                <article key={review.id} className="live-review-card">
                  <div className="live-review-header">
                    <UserAvatar profile={review.authorProfile} name={authorName} className="review-author-avatar" />
                    <div><strong>{authorName}</strong><span>{formatReviewDate(review.createdAt)}</span></div>
                    <span className="review-rating">{'★'.repeat(review.rating)}</span>
                  </div>
                  {review.spoiler ? <span className="spoiler-label">Spoiler</span> : null}
                  {hidden ? (
                    <button type="button" className="spoiler-reveal-btn" onClick={() => setRevealedSpoilers((current) => new Set([...current, review.id]))}>Spoiler yorumunu göster</button>
                  ) : <p>{review.content}</p>}
                  <div className="live-review-actions">
                    <Link to={`/reviews/${review.id}`}>Detayı aç</Link>
                    <ContentLikeButton type="review" contentId={review.id} />
                    {review.uid === user?.uid ? <button type="button" onClick={editOwnReview}>Düzenle</button> : null}
                    {review.uid === user?.uid ? <button type="button" onClick={handleDelete} disabled={saving}>Sil</button> : null}
                  </div>
                </article>
              )
            })}
          </div>
        ) : <EmptyState title="Henüz yorum yok" message="Bu yapım için ilk yorumu sen paylaşabilirsin." />}
      </GlassCard>
    </section>
  )
}

import { useEffect, useState } from 'react'
import { ReviewHero } from '../components/reviews/ReviewHero'
import { SectionHeader } from '../components/reviews/SectionHeader'
import { ReviewCard } from '../components/reviews/ReviewCard'
import { attachReviewProfiles, subscribeToLatestReviews } from '../services/reviews'
import { LoadingSkeleton } from '../components/shared/LoadingSkeleton'
import { ErrorState } from '../components/shared/ErrorState'
import { EmptyState } from '../components/shared/EmptyState'

export function ReviewsPage() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    const unsubscribe = subscribeToLatestReviews(async (items) => {
      try {
        const enriched = await attachReviewProfiles(items)
        if (active) setReviews(enriched)
      } catch {
        if (active) setReviews(items)
      } finally {
        if (active) setLoading(false)
      }
    }, (loadError) => {
      if (active) { setError(loadError.message || 'Yorumlar yüklenemedi.'); setLoading(false) }
    }, 30)
    return () => { active = false; unsubscribe() }
  }, [retryKey])

  return (
    <div className="page-stack">
      <ReviewHero title="İncelemeler" subtitle="Luma topluluğunun en yeni film ve dizi yorumlarını keşfet." />
      <section className="card-section">
        <SectionHeader title="En yeni yorumlar" subtitle={`${reviews.length} yorum`} />
        {loading ? <LoadingSkeleton rows={4} /> : error ? (
          <ErrorState message={error} onRetry={() => setRetryKey((value) => value + 1)} />
        ) : reviews.length ? (
          <div className="review-grid">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div>
        ) : <EmptyState title="Henüz yorum yok" message="Toplulukta yayınlanan ilk yorum burada görünecek." />}
      </section>
    </div>
  )
}

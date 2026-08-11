import { Link } from 'react-router-dom'
import { useRecommendations } from '../../hooks/useRecommendations'
import { MediaCard } from '../media/MediaCard'
import { ErrorState } from '../shared/ErrorState'
import { LoadingSkeleton } from '../shared/LoadingSkeleton'

export function RecommendationEmptyState({ guest = false }) {
  return <div className="recommendation-empty state-card"><h3>{guest ? 'Kişisel önerilerin için giriş yap' : 'İzleme zevkini birlikte oluşturalım'}</h3><p>{guest ? 'Kütüphane ve puanlarından sana özel öneriler hazırlayabilmemiz için hesabına giriş yap.' : 'Seni daha iyi tanıyabilmemiz için birkaç filmi favorilerine ekle, izle veya puanla.'}</p><div className="recommendation-empty__actions">{guest ? <Link className="primary-btn" to="/login" state={{ from: '/for-you' }}>Giriş yap</Link> : null}<Link className={guest ? 'secondary-btn' : 'primary-btn'} to="/discover">Filmleri keşfet</Link>{!guest ? <Link className="secondary-btn" to="/profile">İzleme listeme git</Link> : null}</div></div>
}

export function ForYouSection() {
  const recommendations = useRecommendations(6)
  return <section className="card-section recommendation-section"><div className="section-heading"><div><p className="eyebrow">Sana Özel</p><h2>İzleme zevkine göre seçtik</h2></div>{recommendations.sufficient && recommendations.items.length ? <Link to="/for-you">Tümünü gör</Link> : null}</div>{recommendations.authLoading || recommendations.loading ? <LoadingSkeleton rows={2}/> : recommendations.error ? <ErrorState message={recommendations.error} onRetry={recommendations.retry}/> : recommendations.guest ? <RecommendationEmptyState guest/> : !recommendations.sufficient ? <RecommendationEmptyState/> : recommendations.items.length ? <div className="media-results-grid recommendation-grid">{recommendations.items.map((item) => <MediaCard key={`${item.media_type}_${item.id}`} item={item} reason={item.reason}/>)}</div> : <div className="state-card"><h3>Şimdilik uygun öneri bulunamadı</h3><p>Tercihlerine uyan yeni yapımlar bulduğumuzda burada göstereceğiz.</p></div>}</section>
}

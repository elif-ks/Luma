import { useState } from 'react'
import { MediaCard } from '../components/media/MediaCard'
import { RecommendationEmptyState } from '../components/recommendations/ForYouSection'
import { ErrorState } from '../components/shared/ErrorState'
import { LoadingSkeleton } from '../components/shared/LoadingSkeleton'
import { useRecommendations } from '../hooks/useRecommendations'

export function ForYouPage() {
  const [filter, setFilter] = useState('all')
  const recommendations = useRecommendations(20)
  const items = filter === 'all' ? recommendations.items : recommendations.items.filter((item) => item.media_type === filter)

  return <div className="page-stack for-you-page"><section className="discover-hero-card genre-hero"><p className="eyebrow">Gerçek tercihlerinden</p><h1>Sana Özel Öneriler</h1><p>Favorilerin, izlediklerin ve verdiğin puanlardan hazırlanan açıklanabilir öneriler.</p></section>{recommendations.authLoading || recommendations.loading ? <LoadingSkeleton rows={4}/> : recommendations.error ? <ErrorState message={recommendations.error} onRetry={recommendations.retry}/> : recommendations.guest ? <RecommendationEmptyState guest/> : !recommendations.sufficient ? <RecommendationEmptyState/> : <><section className="profile-section-card recommendation-controls"><div><h2>En güçlü tür tercihlerin</h2><div className="recommendation-genres">{recommendations.genres.map((genre) => <span key={genre.key}>{genre.name}</span>)}</div></div><div className="media-tabs" role="tablist" aria-label="Öneri türü">{[['all','Tümü'],['movie','Filmler'],['tv','Diziler']].map(([key,label]) => <button key={key} type="button" role="tab" aria-selected={filter===key} className={filter===key?'active':''} onClick={()=>setFilter(key)}>{label}</button>)}</div></section><section className="card-section"><div className="section-heading"><div><p className="eyebrow">{items.length} yapım</p><h2>{filter==='movie'?'Film önerileri':filter==='tv'?'Dizi önerileri':'Senin için seçilenler'}</h2></div></div>{items.length ? <div className="media-results-grid recommendation-grid recommendation-grid--full">{items.map((item) => <MediaCard key={`${item.media_type}_${item.id}`} item={item} reason={item.reason}/>)}</div> : <div className="state-card"><h3>Bu filtrede öneri bulunamadı</h3><p>Diğer yapım türündeki önerilere göz atabilirsin.</p></div>}</section></>}</div>
}

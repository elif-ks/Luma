import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getPopularMovies, getPopularTV, getTopRatedMovies, getTrendingMovies, getTrendingTV, getUpcomingMovies } from '../../services/tmdb'
import { MediaCard } from '../media/MediaCard'
import { LoadingSkeleton } from '../shared/LoadingSkeleton'
import { ErrorState } from '../shared/ErrorState'
import { EmptyState } from '../shared/EmptyState'

const SECTIONS = [
  ['trendingMovies','Trend Filmler','movie'], ['popularMovies','Popüler Filmler','movie'],
  ['topRated','En Yüksek Puanlı Filmler','movie'], ['upcoming','Yakında Vizyona Girecekler','movie'],
  ['trendingTV','Trend Diziler','tv'], ['popularTV','Popüler Diziler','tv']
]

export function DiscoverPage() {
  const [params] = useSearchParams(); const trendRef = useRef(null)
  const [data,setData] = useState({}); const [loading,setLoading] = useState(true); const [error,setError] = useState('')
  const load = async () => { setLoading(true); setError(''); try { const values = await Promise.all([getTrendingMovies(),getPopularMovies(),getTopRatedMovies(),getUpcomingMovies(),getTrendingTV(),getPopularTV()]); setData(Object.fromEntries(SECTIONS.map(([key],index) => [key, values[index].results || []]))) } catch(e) { setError(e.message || 'Keşfet verileri yüklenemedi.') } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  useEffect(() => { if (!loading && params.get('section') === 'trending') trendRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }) }, [loading,params])
  if (loading) return <LoadingSkeleton rows={5} />
  if (error) return <ErrorState message={error} onRetry={load} />
  return <div className="discover-page-shell"><section className="discover-hero-card genre-hero"><p className="eyebrow">Gerçek TMDB verileri</p><h1>Yeni favorilerini keşfet</h1><p>Trend filmlerden popüler dizilere uzanan güncel seçkiler.</p></section>{SECTIONS.map(([key,title,type],index) => <section key={key} ref={index === 0 ? trendRef : null} className={`discover-section-card${index === 0 && params.get('section') === 'trending' ? ' highlighted' : ''}`}><div className="section-heading"><h2>{title}</h2></div>{data[key]?.length ? <div className="media-results-grid discover-media-grid">{data[key].slice(0,12).map((item) => <MediaCard key={`${type}-${item.id}`} item={item} mediaType={type} />)}</div> : <EmptyState title="Bölüm boş" message="Şu anda gösterilecek yapım bulunmuyor." />}</section>)}</div>
}

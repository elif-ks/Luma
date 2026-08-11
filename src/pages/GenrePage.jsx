import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getGenreBySlug } from '../config/genres'
import { discoverMoviesByGenre, discoverTVByGenre } from '../services/tmdb'
import { MediaCard } from '../components/media/MediaCard'
import { EmptyState } from '../components/shared/EmptyState'
import { ErrorState } from '../components/shared/ErrorState'
import { PrimaryButton } from '../design-system'

export function GenrePage() {
  const { slug } = useParams(); const genre = getGenreBySlug(slug)
  const [tab, setTab] = useState('all'); const [movies, setMovies] = useState([]); const [tv, setTV] = useState([])
  const [page, setPage] = useState(1); const [loading, setLoading] = useState(true); const [moreLoading, setMoreLoading] = useState(false); const [error, setError] = useState(''); const [hasMore, setHasMore] = useState(true)
  const load = async (nextPage, reset = false) => { if (!genre) return; reset ? setLoading(true) : setMoreLoading(true); setError(''); try { const [movieData, tvData] = await Promise.all([discoverMoviesByGenre(genre.movieId, nextPage), discoverTVByGenre(genre.tvId, nextPage)]); setMovies((old) => reset ? movieData.results || [] : [...old, ...(movieData.results || [])]); setTV((old) => reset ? tvData.results || [] : [...old, ...(tvData.results || [])]); setHasMore(nextPage < Math.max(movieData.total_pages || 1, tvData.total_pages || 1)) } catch (e) { setError(e.message) } finally { setLoading(false); setMoreLoading(false) } }
  useEffect(() => { setPage(1); setMovies([]); setTV([]); load(1, true) }, [slug])
  const items = useMemo(() => tab === 'movie' ? movies.map((item) => ({ ...item, media_type: 'movie' })) : tab === 'tv' ? tv.map((item) => ({ ...item, media_type: 'tv' })) : [...movies.map((item) => ({ ...item, media_type: 'movie' })), ...tv.map((item) => ({ ...item, media_type: 'tv' }))].sort((a,b) => (b.popularity || 0) - (a.popularity || 0)), [movies, tv, tab])
  if (!genre) return <EmptyState title="Tür bulunamadı" message="Aradığın tür Luma'da bulunmuyor." />
  return <div className="page-stack"><section className="discover-hero-card genre-hero"><p className="eyebrow">Tür keşfi</p><h1>{genre.label}</h1><p>TMDB'deki {genre.label.toLocaleLowerCase('tr-TR')} film ve dizilerini keşfet.</p></section><div className="media-tabs" role="tablist">{[['all','Tümü'],['movie','Filmler'],['tv','Diziler']].map(([key,label]) => <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</div>{loading ? <div className="list-loading">Yapımlar yükleniyor…</div> : error ? <ErrorState message={error} onRetry={() => load(1,true)} /> : items.length ? <div className="media-results-grid">{items.map((item) => <MediaCard key={`${item.media_type}-${item.id}`} item={item} />)}</div> : <EmptyState title="Sonuç bulunamadı" message="Bu türde gösterilecek yapım yok." />}{hasMore && !loading && !error ? <PrimaryButton onClick={() => { const next = page + 1; setPage(next); load(next) }} disabled={moreLoading}>{moreLoading ? 'Yükleniyor…' : 'Daha fazla yükle'}</PrimaryButton> : null}</div>
}

import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Badge, GlassCard, PrimaryButton, SecondaryButton } from '../../design-system'
import { useAuth } from '../../context/AuthContext'
import { getLibraryItem, setLibraryStatus } from '../../services/library'
import { getTVCredits, getTVDetails, getTVRecommendations, getTVVideos } from '../../services/tmdb'
import { formatRating, getTmdbBackdropUrl, getTmdbImageUrl, toYear } from '../../services/tmdbHelpers'
import { AddToListsModal } from '../lists/AddToListsModal'
import { MovieReviewSection } from '../reviews/MovieReviewSection'
import { ErrorState } from '../shared/ErrorState'
import { MediaCard } from '../media/MediaCard'
import { DiaryEntryModal } from '../diary/DiaryEntryModal'

const EMPTY = { favorite: false, watched: false, watchlist: false }

export function TVDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, authLoading } = useAuth()
  const [show, setShow] = useState(null)
  const [credits, setCredits] = useState([])
  const [videos, setVideos] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [library, setLibrary] = useState(EMPTY)
  const [pending, setPending] = useState('')
  const [message, setMessage] = useState('')
  const [listModal, setListModal] = useState(false)
  const [diaryModal, setDiaryModal] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([getTVDetails(id), getTVCredits(id), getTVVideos(id), getTVRecommendations(id)])
      .then(([details, cast, trailers, recs]) => {
        if (active) {
          setShow(details)
          setCredits(cast.cast || [])
          setVideos(trailers.results || [])
          setRecommendations(recs.results || [])
        }
      })
      .catch((requestError) => active && setError(requestError.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [id])

  useEffect(() => {
    if (authLoading) return
    if (!user?.uid) {
      setLibrary(EMPTY)
      return
    }
    getLibraryItem(user.uid, 'tv', id)
      .then((item) => setLibrary(item ? {
        favorite: Boolean(item.favorite),
        watched: Boolean(item.watched),
        watchlist: Boolean(item.watchlist)
      } : EMPTY))
      .catch((requestError) => setMessage(requestError.message))
  }, [authLoading, id, user?.uid])

  const requireUser = () => {
    if (user?.uid) return true
    navigate('/login', { state: { from: `${location.pathname}${location.search}` } })
    return false
  }

  const toggle = async (status) => {
    if (!requireUser() || !show) return false
    setPending(status)
    setMessage('')
    try {
      const item = await setLibraryStatus({
        uid: user.uid,
        media: {
          mediaId: show.id,
          mediaType: 'tv',
          title: show.name,
          posterPath: show.poster_path || '',
          releaseDate: show.first_air_date || ''
        },
        status,
        value: !library[status]
      })
      setLibrary(item ? {
        favorite: Boolean(item.favorite),
        watched: Boolean(item.watched),
        watchlist: Boolean(item.watchlist)
      } : EMPTY)
      return true
    } catch (actionError) {
      setMessage(actionError.message)
      return false
    } finally {
      setPending('')
    }
  }

  if (loading) return <div className="list-loading">Dizi bilgileri yükleniyor…</div>
  if (error || !show) return <ErrorState message={error || 'Dizi bulunamadı.'} onRetry={() => window.location.reload()} />

  const trailer = videos.find((video) => video.site === 'YouTube' && video.type === 'Trailer')
  const backdrop = getTmdbBackdropUrl(show.backdrop_path)
  const poster = getTmdbImageUrl(show.poster_path)
  const diaryMedia = { mediaId: show.id, mediaType: 'tv', title: show.name, posterPath: show.poster_path || '', releaseDate: show.first_air_date || '' }

  return (
    <div className="movie-detail-page">
      <section className="movie-hero">
        <div className="movie-hero-backdrop" style={{ backgroundImage: backdrop ? `url(${backdrop})` : undefined }} />
        <div className="movie-hero-overlay" />
        <div className="movie-hero-content">
          <div className="movie-poster-card">
            {poster ? <img src={poster} alt={show.name} className="movie-poster-graphic movie-poster-image" /> : <div className="movie-poster-graphic movie-poster-fallback" />}
          </div>
          <div className="movie-info">
            <p className="movie-eyebrow">Dizi keşfi</p>
            <div className="movie-title-row">
              <div><h1>{show.name}</h1><p className="movie-original">{show.original_name}</p></div>
              <Badge variant="accent">⭐ {formatRating(show.vote_average)}</Badge>
            </div>
            <div className="movie-meta"><span>{toYear(show.first_air_date)}</span><span>{show.number_of_seasons} sezon</span><span>{show.number_of_episodes} bölüm</span><span>{show.status}</span></div>
            <div className="movie-tags">{show.genres?.map((genre) => <span key={genre.id}>{genre.name}</span>)}</div>
            <p className="movie-description">{show.overview || 'Bu dizi için özet bulunmuyor.'}</p>
            <div className="movie-actions">
              {trailer ? <PrimaryButton onClick={() => window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank', 'noopener,noreferrer')}>Fragmanı izle</PrimaryButton> : null}
              <SecondaryButton aria-haspopup="dialog" aria-label="İzleme listesi ve özel listeleri yönet" onClick={() => { if (requireUser()) setListModal(true) }}>+ Listeye ekle</SecondaryButton>
              <SecondaryButton onClick={() => { if (requireUser()) setDiaryModal(true) }}>+ Günlüğe ekle</SecondaryButton>
            </div>
            <div className="movie-library-actions">
              {[
                ['favorite', '☆ Favoriye ekle', '★ Favoride'],
                ['watched', 'İzledim', '✓ İzledim']
              ].map(([key, off, on]) => (
                <button key={key} className={`movie-library-btn${library[key] ? ' active' : ''}`} aria-pressed={library[key]} disabled={Boolean(pending)} onClick={() => toggle(key)}>
                  {pending === key ? 'Kaydediliyor…' : library[key] ? on : off}
                </button>
              ))}
            </div>
            {message ? <p className="movie-library-error">{message}</p> : null}
          </div>
        </div>
      </section>
      <MovieReviewSection movie={show} mediaType="tv" />
      <section className="movie-content-grid">
        <div className="movie-main-column">
          <GlassCard className="movie-section-card"><div className="section-header"><h2>Oyuncular</h2></div><div className="cast-row">{credits.slice(0, 10).map((person) => <div key={person.id} className="cast-card">{person.profile_path ? <img src={getTmdbImageUrl(person.profile_path, 'w185')} alt={person.name} className="cast-avatar" /> : <div className="cast-avatar cast-avatar-fallback" />}<strong>{person.name}</strong><span>{person.character}</span></div>)}</div></GlassCard>
          <GlassCard className="movie-section-card"><div className="section-header"><h2>Önerilen Diziler</h2></div><div className="media-results-grid">{recommendations.slice(0, 6).map((item) => <MediaCard key={item.id} item={item} mediaType="tv" />)}</div></GlassCard>
        </div>
      </section>
      {listModal ? <AddToListsModal movie={show} mediaType="tv" isWatchlisted={library.watchlist} watchlistLoading={pending === 'watchlist'} onToggleWatchlist={() => toggle('watchlist')} onClose={() => setListModal(false)} /> : null}
      {diaryModal ? <DiaryEntryModal user={user} media={diaryMedia} onClose={() => setDiaryModal(false)} onSaved={() => { setMessage('Günlük kaydın eklendi.'); setLibrary((value) => ({ ...value, watched: true, watchlist: false })) }} /> : null}
    </div>
  )
}

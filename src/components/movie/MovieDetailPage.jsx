import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { PrimaryButton, SecondaryButton, Badge, GlassCard } from '../../design-system'
import { getMovieCredits, getMovieDetails, getMovieRecommendations, getMovieSimilar, getMovieVideos } from '../../services/tmdb'
import { formatCurrency, formatRating, formatRuntime, getTmdbBackdropUrl, getTmdbImageUrl, toYear } from '../../services/tmdbHelpers'
import { EmptyState } from '../shared/EmptyState'
import { ErrorState } from '../shared/ErrorState'
import { useAuth } from '../../context/AuthContext'
import { getLibraryItem, setLibraryStatus } from '../../services/library'
import { MovieReviewSection } from '../reviews/MovieReviewSection'
import { AddToListsModal } from '../lists/AddToListsModal'
import { DiaryEntryModal } from '../diary/DiaryEntryModal'

const EMPTY_LIBRARY_STATE = { favorite: false, watched: false, watchlist: false }

export function MovieDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, authLoading } = useAuth()
  const [movie, setMovie] = useState(null)
  const [credits, setCredits] = useState({ cast: [], crew: [] })
  const [videos, setVideos] = useState([])
  const [similar, setSimilar] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [libraryState, setLibraryState] = useState(EMPTY_LIBRARY_STATE)
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [libraryPending, setLibraryPending] = useState('')
  const [libraryError, setLibraryError] = useState('')
  const [listModalOpen, setListModalOpen] = useState(false)
  const [diaryModalOpen, setDiaryModalOpen] = useState(false)
  const [diarySuccess, setDiarySuccess] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadMovieData() {
      setLoading(true)
      setError('')

      try {
        const [movieData, creditsData, videosData, similarData, recommendationsData] = await Promise.all([
          getMovieDetails(id),
          getMovieCredits(id),
          getMovieVideos(id),
          getMovieSimilar(id),
          getMovieRecommendations(id)
        ])

        if (!isMounted) return

        setMovie(movieData)
        setCredits(creditsData || { cast: [], crew: [] })
        setVideos(videosData?.results || [])
        setSimilar(similarData?.results || [])
        setRecommendations(recommendationsData?.results || [])
      } catch (e) {
        if (isMounted) {
          setError(e.message || 'Film bilgileri yüklenemedi.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadMovieData()

    return () => {
      isMounted = false
    }
  }, [id])

  useEffect(() => {
    let isMounted = true

    if (authLoading) return () => { isMounted = false }

    if (!user?.uid) {
      setLibraryState(EMPTY_LIBRARY_STATE)
      setLibraryLoading(false)
      setLibraryError('')
      return () => { isMounted = false }
    }

    setLibraryLoading(true)
    setLibraryError('')

    getLibraryItem(user.uid, 'movie', id)
      .then((item) => {
        if (!isMounted) return
        setLibraryState(item ? {
          favorite: Boolean(item.favorite),
          watched: Boolean(item.watched),
          watchlist: Boolean(item.watchlist)
        } : EMPTY_LIBRARY_STATE)
      })
      .catch((loadError) => {
        if (isMounted) setLibraryError(loadError.message || 'Film durumları yüklenemedi.')
      })
      .finally(() => {
        if (isMounted) setLibraryLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [authLoading, id, user?.uid])

  const handleLibraryAction = async (status) => {
    if (!user?.uid) {
      navigate('/login', {
        state: { from: `${location.pathname}${location.search}` }
      })
      return
    }

    if (!movie || libraryPending) return

    setLibraryPending(status)
    setLibraryError('')

    try {
      const updatedItem = await setLibraryStatus({
        uid: user.uid,
        media: {
          mediaId: movie.id,
          mediaType: 'movie',
          title: movie.title,
          posterPath: movie.poster_path || '',
          releaseDate: movie.release_date || ''
        },
        status,
        value: !libraryState[status]
      })

      setLibraryState(updatedItem ? {
        favorite: Boolean(updatedItem.favorite),
        watched: Boolean(updatedItem.watched),
        watchlist: Boolean(updatedItem.watchlist)
      } : EMPTY_LIBRARY_STATE)
      return true
    } catch (actionError) {
      setLibraryError(actionError.message || 'Film durumu güncellenemedi. Lütfen tekrar deneyin.')
      return false
    } finally {
      setLibraryPending('')
    }
  }

  const handleOpenLists = () => {
    if (!user?.uid) {
      navigate('/login', { state: { from: `${location.pathname}${location.search}` } })
      return
    }
    setListModalOpen(true)
  }

  const handleOpenDiary = () => {
    if (!user?.uid) { navigate('/login', { state: { from: `${location.pathname}${location.search}` } }); return }
    setDiarySuccess(''); setDiaryModalOpen(true)
  }

  if (loading) {
    return (
      <div className="movie-detail-page">
        <section className="movie-hero movie-hero-skeleton">
          <div className="movie-hero-content">
            <div className="movie-poster-card">
              <div className="movie-poster-graphic skeleton-card" />
            </div>
            <div className="movie-info">
              <div className="skeleton-card skeleton-line skeleton-line-lg" />
              <div className="skeleton-card skeleton-line" />
              <div className="skeleton-card skeleton-line skeleton-line-short" />
              <div className="movie-tags">
                <div className="skeleton-card skeleton-pill" />
                <div className="skeleton-card skeleton-pill" />
                <div className="skeleton-card skeleton-pill" />
              </div>
            </div>
          </div>
        </section>

        <section className="movie-content-grid">
          <div className="movie-main-column">
            <GlassCard className="movie-section-card">
              <div className="skeleton-card skeleton-line skeleton-line-lg" />
              <div className="skeleton-card skeleton-line" />
              <div className="skeleton-card skeleton-line skeleton-line-short" />
            </GlassCard>
            <GlassCard className="movie-section-card">
              <div className="skeleton-card skeleton-line skeleton-line-lg" />
              <div className="cast-row">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="skeleton-card skeleton-cast-card" />
                ))}
              </div>
            </GlassCard>
          </div>
        </section>
      </div>
    )
  }

  if (error) {
    return (
      <div className="movie-detail-page">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    )
  }

  if (!movie) {
    return (
      <div className="movie-detail-page">
        <EmptyState title="Film bulunamadı" message="İstenen film mevcut değil veya artık görüntülenemiyor." />
      </div>
    )
  }

  const cast = (credits.cast || []).slice(0, 12)
  const crewGroups = {
    Director: (credits.crew || []).filter((person) => person.job === 'Director').map((person) => person.name),
    Writer: (credits.crew || []).filter((person) => person.job === 'Writer').map((person) => person.name),
    Screenplay: (credits.crew || []).filter((person) => person.job === 'Screenplay').map((person) => person.name),
    Music: (credits.crew || []).filter((person) => ['Original Music Composer', 'Music', 'Composer'].includes(person.job)).map((person) => person.name),
    Producer: (credits.crew || []).filter((person) => ['Producer', 'Executive Producer'].includes(person.job)).map((person) => person.name)
  }

  const trailer = videos.find((video) => video.site === 'YouTube' && video.type === 'Trailer' && video.official) ||
    videos.find((video) => video.site === 'YouTube' && video.type === 'Trailer') ||
    videos.find((video) => video.site === 'YouTube')

  const heroBackdrop = getTmdbBackdropUrl(movie.backdrop_path)
  const posterUrl = getTmdbImageUrl(movie.poster_path)
  const releaseLabel = movie.release_date ? new Date(movie.release_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

  return (
    <div className="movie-detail-page">
      <section className="movie-hero">
        <div className="movie-hero-backdrop" style={{ backgroundImage: heroBackdrop ? `url(${heroBackdrop})` : undefined }} />
        <div className="movie-hero-overlay" />
        <div className="movie-hero-content">
          <div className="movie-poster-card">
            {posterUrl ? (
              <img src={posterUrl} alt={movie.title} className="movie-poster-graphic movie-poster-image" loading="lazy" />
            ) : (
              <div className="movie-poster-graphic movie-poster-fallback" />
            )}
          </div>

          <div className="movie-info">
            <div className="movie-title-row">
              <div>
                <p className="movie-eyebrow">Sinema deneyimi</p>
                <h1>{movie.title}</h1>
                <p className="movie-original">{movie.original_title}</p>
                {movie.tagline ? <p className="movie-original">“{movie.tagline}”</p> : null}
              </div>
              <Badge variant="accent">⭐ {formatRating(movie.vote_average)}</Badge>
            </div>

            <div className="movie-meta">
              <span>{toYear(movie.release_date)}</span>
              <span>{formatRuntime(movie.runtime)}</span>
              <span>{movie.original_language?.toUpperCase() || '—'}</span>
            </div>

            <div className="movie-tags">
              {(movie.genres || []).map((genre) => (
                <span key={genre.id}>{genre.name}</span>
              ))}
            </div>

            <div className="movie-rating-row">
              <div className="rating-pill">
                <strong>Oy</strong>
                <span>{formatRating(movie.vote_average)}</span>
              </div>
              <div className="rating-pill">
                <strong>Toplam</strong>
                <span>{movie.vote_count}</span>
              </div>
            </div>

            <div className="movie-stats">
              <div><strong>{movie.popularity?.toFixed(0) || '—'}</strong><span>Popülerlik</span></div>
              <div><strong>{movie.status || '—'}</strong><span>Durum</span></div>
              <div><strong>{formatCurrency(movie.budget)}</strong><span>Bütçe</span></div>
              <div><strong>{formatCurrency(movie.revenue)}</strong><span>Hasılat</span></div>
            </div>

            <div className="movie-actions">
              {trailer ? <PrimaryButton onClick={() => window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank', 'noopener,noreferrer')}>🎬 Fragmanı İzle</PrimaryButton> : null}
              {movie.homepage ? <SecondaryButton onClick={() => window.open(movie.homepage, '_blank', 'noopener,noreferrer')}>Resmî site</SecondaryButton> : null}
            </div>

            <div className="movie-library-actions" aria-label="Film kütüphanesi işlemleri">
              <button
                type="button"
                className={`movie-library-btn${libraryState.favorite ? ' active' : ''}`}
                aria-pressed={libraryState.favorite}
                disabled={authLoading || libraryLoading || Boolean(libraryPending)}
                onClick={() => handleLibraryAction('favorite')}
              >
                {libraryPending === 'favorite' ? 'Kaydediliyor…' : libraryState.favorite ? '★ Favoride' : '☆ Favoriye ekle'}
              </button>
              <button
                type="button"
                className={`movie-library-btn${libraryState.watched ? ' active' : ''}`}
                aria-pressed={libraryState.watched}
                disabled={authLoading || libraryLoading || Boolean(libraryPending)}
                onClick={() => handleLibraryAction('watched')}
              >
                {libraryPending === 'watched' ? 'Kaydediliyor…' : libraryState.watched ? '✓ İzledim' : 'İzledim'}
              </button>
              <button
                type="button"
                className={`movie-library-btn${libraryState.watchlist ? ' active' : ''}`}
                aria-haspopup="dialog"
                aria-label="İzleme listesi ve özel listeleri yönet"
                onClick={handleOpenLists}
                disabled={authLoading}
              >
                + Listeye ekle
              </button>
              <button type="button" className="movie-library-btn" onClick={handleOpenDiary} disabled={authLoading}>+ Günlüğe ekle</button>
            </div>
            {libraryError ? <p className="movie-library-error">{libraryError}</p> : null}
            {diarySuccess ? <p className="auth-message auth-message-success">{diarySuccess}</p> : null}
          </div>
        </div>
      </section>

      <MovieReviewSection movie={movie} />
      {listModalOpen ? (
        <AddToListsModal
          movie={movie}
          isWatchlisted={libraryState.watchlist}
          watchlistLoading={libraryPending === 'watchlist'}
          onToggleWatchlist={() => handleLibraryAction('watchlist')}
          onClose={() => setListModalOpen(false)}
        />
      ) : null}
      {diaryModalOpen ? <DiaryEntryModal user={user} media={{ mediaId: movie.id, mediaType: 'movie', title: movie.title, posterPath: movie.poster_path || '', releaseDate: movie.release_date || '' }} onClose={() => setDiaryModalOpen(false)} onSaved={() => { setDiarySuccess('Günlük kaydın eklendi.'); setLibraryState((value) => ({ ...value, watched: true, watchlist: false })) }} /> : null}

      <section className="movie-content-grid">
        <div className="movie-main-column">
          <GlassCard className="movie-section-card">
            <div className="section-header">
              <h2>Özet</h2>
            </div>
            <p className="movie-description">{movie.overview || 'Bu film için özet bilgisi bulunmuyor.'}</p>
            <div className="detail-grid">
              <div><span>Çıkış</span><strong>{releaseLabel}</strong></div>
              <div><span>Süre</span><strong>{formatRuntime(movie.runtime)}</strong></div>
              <div><span>Orijinal dil</span><strong>{movie.original_language?.toUpperCase() || '—'}</strong></div>
              <div><span>Durum</span><strong>{movie.status || '—'}</strong></div>
            </div>
          </GlassCard>

          <GlassCard className="movie-section-card">
            <div className="section-header">
              <h2>Oyuncular</h2>
            </div>
            <div className="cast-row">
              {cast.map((person) => (
                <div key={`${person.name}-${person.character}`} className="cast-card">
                  {person.profile_path ? (
                    <img src={getTmdbImageUrl(person.profile_path, 'w185')} alt={person.name} className="cast-avatar" loading="lazy" />
                  ) : (
                    <div className="cast-avatar cast-avatar-fallback" />
                  )}
                  <h3>{person.name}</h3>
                  <p>{person.character || '—'}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="movie-section-card">
            <div className="section-header">
              <h2>Ekibin</h2>
            </div>
            <div className="crew-grid">
              {Object.entries(crewGroups).map(([label, names]) => (
                <div key={label} className="crew-card">
                  <span>{label}</span>
                  <strong>{names.length ? names.join(', ') : '—'}</strong>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="movie-section-card">
            <div className="section-header">
              <h2>Fragman</h2>
            </div>
            {trailer ? (
              <div className="trailer-frame">
                <iframe
                  className="trailer-iframe"
                  src={`https://www.youtube.com/embed/${trailer.key}`}
                  title={trailer.name || movie.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <EmptyState title="Fragman bulunamadı" message="Bu film için resmi fragman henüz eklenmemiş." />
            )}
          </GlassCard>

          <GlassCard className="movie-section-card">
            <div className="section-header">
              <h2>Önerilen filmler</h2>
            </div>
            <div className="media-row">
              {recommendations.length ? recommendations.slice(0, 6).map((item) => (
                <Link key={item.id} to={`/movie/${item.id}`} className="media-card">
                  {item.poster_path ? (
                    <img src={getTmdbImageUrl(item.poster_path, 'w342')} alt={item.title} className="media-poster" loading="lazy" />
                  ) : (
                    <div className="media-poster media-poster-fallback" />
                  )}
                  <div className="media-card-body">
                    <h3>{item.title}</h3>
                    <p>{toYear(item.release_date)}</p>
                    <span>⭐ {formatRating(item.vote_average)}</span>
                  </div>
                </Link>
              )) : <EmptyState title="Öneri yok" message="Bu film için öneri bulunamadı." />}
            </div>
          </GlassCard>
        </div>

        <aside className="movie-side-column">
          <GlassCard className="movie-section-card">
            <div className="section-header">
              <h2>Topluluk</h2>
            </div>
            <div className="community-stack">
              <div className="community-card">
                <h3>Öne çıkan metrikler</h3>
                <div className="community-list">
                  <div><strong>Oy ortalaması</strong><span>{formatRating(movie.vote_average)}</span></div>
                  <div><strong>Toplam oy</strong><span>{movie.vote_count}</span></div>
                  <div><strong>Popülerlik</strong><span>{movie.popularity?.toFixed(0) || '—'}</span></div>
                  <div><strong>Durum</strong><span>{movie.status || '—'}</span></div>
                </div>
              </div>
              {movie.homepage ? (
                <div className="community-card">
                  <h3>Resmî site</h3>
                  <a href={movie.homepage} target="_blank" rel="noreferrer" className="movie-link">{movie.homepage}</a>
                </div>
              ) : null}
            </div>
          </GlassCard>

          <GlassCard className="movie-section-card">
            <div className="section-header">
              <h2>Benzer filmler</h2>
            </div>
            <div className="similar-list">
              {similar.length ? similar.slice(0, 5).map((item) => (
                <Link key={item.id} to={`/movie/${item.id}`} className="similar-card">
                  {item.poster_path ? (
                    <img src={getTmdbImageUrl(item.poster_path, 'w154')} alt={item.title} className="similar-poster" loading="lazy" />
                  ) : (
                    <div className="similar-poster similar-poster-fallback" />
                  )}
                  <div>
                    <h3>{item.title}</h3>
                    <p>{toYear(item.release_date)}</p>
                    <span>⭐ {formatRating(item.vote_average)}</span>
                  </div>
                </Link>
              )) : <EmptyState title="Benzer film yok" message="Bu film için benzer içerik bulunamadı." />}
            </div>
          </GlassCard>
        </aside>
      </section>
    </div>
  )
}

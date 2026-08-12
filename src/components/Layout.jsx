import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { searchMulti } from '../services/tmdb'
import { searchProfilesByUsername } from '../services/profile'
import { searchCommunities } from '../services/communities'
import { getTmdbImageUrl, toYear } from '../services/tmdbHelpers'
import { useAuth } from '../context/AuthContext'
import { UserAvatar } from './shared/UserAvatar'
import { useSafety } from '../context/SafetyContext'
import { useNotifications } from '../context/NotificationContext'

const SEARCH_RESULT_LIMIT = 8
const MEDIA_TYPE_LABELS = {
  movie: 'Film',
  tv: 'Dizi',
  person: 'Kişi'
}

export function Layout({ children }) {
  return <div className="app-shell">{children}</div>
}

export function TopNav({ onMenuOpen, mobileMenuOpen = false }) {
  const navigate = useNavigate()
  const { user, profile, authLoading } = useAuth()
  const { blockedUids, mutedUids } = useSafety()
  const { unreadCount, unreadConversationCount } = useNotifications()
  const searchRef = useRef(null)
  const searchRequestId = useRef(0)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [userResults, setUserResults] = useState([])
  const [communityResults, setCommunityResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    const trimmedQuery = query.trim()

    if (trimmedQuery.length < 2) {
      searchRequestId.current += 1
      setResults([])
      setUserResults([])
      setCommunityResults([])
      setLoading(false)
      setError('')
      setIsOpen(false)
      return
    }

    const timer = window.setTimeout(async () => {
      const requestId = ++searchRequestId.current
      setLoading(true)
      setError('')
      setIsOpen(true)

      try {
        const [mediaResponse, userResponse, communityResponse] = await Promise.allSettled([searchMulti(trimmedQuery), searchProfilesByUsername(trimmedQuery, 5), searchCommunities(trimmedQuery, 10)])
        if (mediaResponse.status === 'rejected' && userResponse.status === 'rejected') throw mediaResponse.reason
        const data = mediaResponse.status === 'fulfilled' ? mediaResponse.value : null
        const profiles = userResponse.status === 'fulfilled' ? userResponse.value.filter((item) => !blockedUids.has(item.uid) && !mutedUids.has(item.uid)) : []
        const communities = communityResponse.status === 'fulfilled' ? communityResponse.value.filter((item) => !blockedUids.has(item.ownerUid)) : []
        const filteredResults = (data?.results || [])
          .filter((item) => ['movie', 'tv', 'person'].includes(item.media_type))
          .slice(0, SEARCH_RESULT_LIMIT)

        if (searchRequestId.current !== requestId) return
        setResults(filteredResults)
        setUserResults(profiles.slice(0, 5))
        setCommunityResults(communities)
        setError('')
        setActiveIndex(-1)
      } catch (e) {
        if (searchRequestId.current !== requestId) return
        setResults([])
        setUserResults([])
        setCommunityResults([])
        setError(e.message || 'Arama sonuçları yüklenemedi.')
      } finally {
        if (searchRequestId.current === requestId) setLoading(false)
      }
    }, 350)

    return () => window.clearTimeout(timer)
  }, [query, blockedUids, mutedUids])

  const handleSelectResult = (item) => {
    if (!item || item.media_type === 'person') return
    setIsOpen(false)
    setActiveIndex(-1)
    setQuery('')
    setResults([])
    setUserResults([])

    if (item.media_type === 'movie') {
      navigate(`/movie/${item.id}`)
    } else if (item.media_type === 'tv') {
      navigate(`/tv/${item.id}`)
    }
  }

  const showAllResults = () => {
    const value = query.trim()
    if (value.length < 2) return
    setIsOpen(false); setActiveIndex(-1)
    navigate(`/search?q=${encodeURIComponent(value)}`)
  }

  const handleKeyDown = (event) => {
    if (!isOpen && event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((currentIndex) => (results.length + userResults.length + communityResults.length ? (currentIndex + 1) % (results.length + userResults.length + communityResults.length) : 0))
      setIsOpen(true)
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((currentIndex) => (results.length + userResults.length + communityResults.length ? (currentIndex <= 0 ? results.length + userResults.length + communityResults.length - 1 : currentIndex - 1) : 0))
      setIsOpen(true)
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (activeIndex >= 0 && results[activeIndex]) {
        handleSelectResult(results[activeIndex])
      } else if (activeIndex >= results.length && userResults[activeIndex - results.length]) {
        const selectedUser = userResults[activeIndex - results.length]
        setIsOpen(false); setActiveIndex(-1); setQuery(''); setResults([]); setUserResults([])
        navigate(`/profile/${encodeURIComponent(selectedUser.username)}`)
      } else if (communityResults[activeIndex - results.length - userResults.length]) {
        const selectedCommunity = communityResults[activeIndex - results.length - userResults.length]
        setIsOpen(false); setActiveIndex(-1); setQuery(''); setResults([]); setUserResults([]); setCommunityResults([])
        navigate(`/communities/${selectedCommunity.id}`)
      } else {
        showAllResults()
      }
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <header className="top-nav">
      <button
        type="button"
        className="mobile-menu-trigger"
        aria-label="Navigasyon menüsünü aç"
        aria-expanded={mobileMenuOpen}
        aria-controls="mobile-navigation"
        onClick={onMenuOpen}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>
      <Link to="/" className="brand-wrap">
        <div className="brand-mark" />
        <div>
          <div className="brand-name">Luma</div>
          <div className="brand-tag">Watch. Write. Share.</div>
        </div>
      </Link>

      <div className="search-shell" ref={searchRef}>
        <label className="search-pill">
          <span>⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => {
              if (query.trim().length >= 2) {
                setIsOpen(true)
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ara: film, dizi, kullanıcı, topluluk..."
          />
        </label>

        {isOpen ? (
          <div className="search-dropdown" role="listbox" aria-label="Search results">
            {loading ? (
              <div className="search-dropdown-state">Aranıyor...</div>
            ) : error ? (
              <div className="search-dropdown-state">
                <strong>Arama hatası</strong>
                <p>{error}</p>
              </div>
            ) : results.length || userResults.length || communityResults.length ? (
              <div className="search-results-scroll"><ul className="search-results-list">
                {results.length ? <li className="search-result-section-title">Filmler, diziler ve kişiler</li> : null}
                {results.map((item, index) => {
                  const title = item.title || item.name || 'İsimsiz sonuç'
                  const posterPath = item.poster_path || item.profile_path || item.backdrop_path
                  const year = item.release_date ? toYear(item.release_date) : item.first_air_date ? toYear(item.first_air_date) : ''

                  return (
                    <li key={`${item.media_type}-${item.id}`}>
                      <button
                        type="button"
                        className={`search-result-item${index === activeIndex ? ' active' : ''}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => item.media_type !== 'person' && handleSelectResult(item)}
                        disabled={item.media_type === 'person'}
                      >
                        <div className="search-result-art">
                          {posterPath ? (
                            <img src={getTmdbImageUrl(posterPath, item.media_type === 'person' ? 'w185' : 'w92')} alt={title} loading="lazy" />
                          ) : (
                            <div className="search-result-art-fallback" />
                          )}
                        </div>
                        <div className="search-result-copy">
                          <strong>{title}</strong>
                          <span>{MEDIA_TYPE_LABELS[item.media_type] || item.media_type}</span>
                          {year ? <span>{year}</span> : null}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>{userResults.length ? <><h3 className="search-result-section-title">Kullanıcılar</h3><ul className="search-results-list search-user-results">{userResults.map((profile,index)=><li key={profile.uid}><button type="button" className={`search-result-item${results.length+index===activeIndex?' active':''}`} onMouseDown={(event)=>event.preventDefault()} onClick={()=>{setIsOpen(false);setActiveIndex(-1);setQuery('');setResults([]);setUserResults([]);setCommunityResults([]);navigate(`/profile/${encodeURIComponent(profile.username)}`)}}><UserAvatar profile={profile} name={profile.username} className="search-user-avatar"/><div className="search-result-copy"><strong>{profile.username}</strong>{profile.bio?<span>{profile.bio.slice(0,70)}</span>:null}</div></button></li>)}</ul></>:null}{communityResults.length ? <><h3 className="search-result-section-title">Topluluklar</h3><ul className="search-results-list">{communityResults.map((item,index)=><li key={item.id}><button type="button" className={`search-result-item${results.length+userResults.length+index===activeIndex?' active':''}`} onMouseDown={(event)=>event.preventDefault()} onClick={()=>{setIsOpen(false);setActiveIndex(-1);setQuery('');setResults([]);setUserResults([]);setCommunityResults([]);navigate(`/communities/${item.id}`)}}><div className={`search-result-art community-theme-${item.theme}`}><strong>{item.name.charAt(0)}</strong></div><div className="search-result-copy"><strong>{item.name}</strong><span>{item.memberCount || 0} üye</span></div></button></li>)}</ul></>:null}</div>
            ) : (
              <div className="search-dropdown-state">
                <strong>Sonuç yok</strong>
                <p>En az 2 karakter yazın ve tekrar deneyin.</p>
              </div>
            )}
            {!loading && !error && query.trim().length >= 2 ? <button type="button" className="search-all-results" onMouseDown={(event) => event.preventDefault()} onClick={showAllResults}>Tüm sonuçları gör</button> : null}
          </div>
        ) : null}
      </div>

      <div className="nav-actions">
        {!authLoading && user ? <Link to="/messages" className="top-notification-link" aria-label={unreadConversationCount ? `${unreadConversationCount} okunmamış konuşma` : 'Mesajlar'}>Mesajlar{unreadConversationCount ? <span>{unreadConversationCount > 9 ? '9+' : unreadConversationCount}</span> : null}</Link> : null}
        {!authLoading && user ? <Link to="/notifications" className="top-notification-link" aria-label={unreadCount ? `${unreadCount} okunmamış bildirim` : 'Bildirimler'}>Bildirimler{unreadCount ? <span>{unreadCount > 9 ? '9+' : unreadCount}</span> : null}</Link> : null}
        {!authLoading && user ? (
          <Link to="/profile" className="profile-pill">
            <UserAvatar profile={profile} user={user} className="avatar-sm" />
            <span>{profile?.username || user.displayName || 'Luma kullanıcısı'}</span>
          </Link>
        ) : null}
      </div>
    </header>
  )
}

export function Sidebar({ variant = 'desktop', onNavigate }) {
  const navigate = useNavigate()
  const { user, profile, profileLoading, loading, authLoading, signOut } = useAuth()
  const { unreadCount, unreadConversationCount } = useNotifications()
  const [accountError, setAccountError] = useState('')
  const items = [
    { label: 'Ana Sayfa', to: '/' },
    { label: 'Aktivite', to: '/activity' },
    { label: 'Keşfet', to: '/discover' },
    { label: 'Kullanıcılar', to: '/people' },
    { label: 'Topluluklar', to: '/communities' },
    { label: 'Profil', to: '/profile' },
    { label: 'İncelemeler', to: '/reviews' },
    { label: 'Listeler', to: '/lists' },
    { label: 'Diary', to: '/diary' }
    ,{ label: 'Mesajlar', to: '/messages', badge: unreadConversationCount, badgeLabel: 'okunmamış konuşma' }
    ,{ label: 'Bildirimler', to: '/notifications', badge: unreadCount, badgeLabel: 'okunmamış bildirim' }
    ,{ label: 'Ayarlar', to: '/settings' }
  ]

  const handleSignOut = async () => {
    setAccountError('')

    try {
      await signOut()
      onNavigate?.()
      navigate('/login', { replace: true })
    } catch (signOutError) {
      setAccountError(signOutError.message || 'Çıkış yapılamadı. Lütfen tekrar deneyin.')
    }
  }

  const accountName = profile?.username || user?.displayName || 'Luma kullanıcısı'
  const accountInitial = accountName.trim().charAt(0).toLocaleUpperCase('tr-TR') || 'L'

  return (
    <div className={`sidebar sidebar--${variant}`}>
      <nav className="side-nav">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} onClick={onNavigate} className={({ isActive }) => `side-item${isActive ? ' active' : ''}`}>
            <span>{item.label}</span>
            {item.badge ? <span className="notification-nav-badge" aria-label={`${item.badge} ${item.badgeLabel || 'okunmamış bildirim'}`}>{item.badge > 9 ? '9+' : item.badge}</span> : null}
          </NavLink>
        ))}
      </nav>

      <section className="sidebar-account" aria-label="Hesap">
        {authLoading ? (
          <div className="sidebar-account-loading" aria-label="Hesap bilgileri yükleniyor">
            <span className="account-skeleton-avatar" />
            <span className="account-skeleton-line" />
          </div>
        ) : user ? (
          <>
            <div className="sidebar-account-user">
              <UserAvatar profile={profile} user={user} name={accountName} className="sidebar-account-avatar" />
              <div className="sidebar-account-copy">
                <strong><Link onClick={onNavigate} to={profile?.username ? `/profile/${encodeURIComponent(profile.username)}` : '/profile'}>{accountName}</Link></strong>
                {profileLoading ? <span className="account-profile-loading">Profil yükleniyor…</span> : null}
              </div>
            </div>
            {accountError ? <p className="sidebar-account-error">{accountError}</p> : null}
            <button
              type="button"
              className="sidebar-signout-btn"
              onClick={handleSignOut}
              disabled={loading}
            >
              {loading ? 'Çıkış yapılıyor…' : 'Çıkış yap'}
            </button>
          </>
        ) : (
          <div className="sidebar-account-guest">
            <Link onClick={onNavigate} to="/login" className="sidebar-login-btn">Giriş yap</Link>
            <Link onClick={onNavigate} to="/register" className="sidebar-register-link">Kayıt ol</Link>
          </div>
        )}
      </section>
    </div>
  )
}

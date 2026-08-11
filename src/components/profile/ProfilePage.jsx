import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GlassCard, Modal, PrimaryButton, SecondaryButton } from '../../design-system'
import { EmptyState } from '../shared/EmptyState'
import { useAuth } from '../../context/AuthContext'
import { validateUsername } from '../../utils/username'
import { subscribeToUserLibrary } from '../../services/library'
import { getTmdbImageUrl, toYear } from '../../services/tmdbHelpers'
import { ErrorState } from '../shared/ErrorState'
import { subscribeToUserReviews } from '../../services/reviews'
import { subscribeToUserLists } from '../../services/lists'
import { attachPostProfiles, subscribeToUserPosts } from '../../services/posts'
import { PostCard } from '../social/PostCard'
import { subscribeToUserDiary } from '../../services/diary'
import { DiaryEntry } from '../diary/DiaryEntry'
import { UserAvatar } from '../shared/UserAvatar'
import { ContentLikeButton } from '../shared/ContentLikeButton'
import { AvatarPickerModal } from './AvatarPickerModal'
import { FollowListModal } from './FollowListModal'
import { ActivityFeed } from '../activity/ActivityFeed'
import { UserCommunitiesSection } from '../communities/UserCommunitiesSection'
import { subscribeToLibraryPrivacy } from '../../services/libraryPrivacy'
import { attachFollowProfiles, subscribeToFollowers, subscribeToFollowing } from '../../services/follows'
import '../../app.css'

const LIBRARY_TABS = [
  { key: 'favorite', label: 'Favoriler', emptyMessage: 'Henüz favori film eklenmedi.', dateField: 'favoriteAt' },
  { key: 'watchlist', label: 'İzleme Listem', emptyMessage: 'İzleme listende henüz bir yapım yok.', dateField: 'watchlistAt' },
  { key: 'watched', label: 'İzlediklerim', emptyMessage: 'Henüz izlediğin bir yapım eklenmedi.', dateField: 'watchedAt' }
]

function timestampValue(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (typeof value?.seconds === 'number') return value.seconds * 1000
  return 0
}

function reviewDate(value) {
  const date = typeof value?.toDate === 'function' ? value.toDate() : null
  return date ? date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Şimdi'
}

export function ProfilePage() {
  const { user, profile, profileLoading, profileError, updateUsername, updateAvatar } = useAuth()
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [username, setUsername] = useState('')
  const [usernameSaving, setUsernameSaving] = useState(false)
  const [usernameError, setUsernameError] = useState('')
  const [usernameSuccess, setUsernameSuccess] = useState('')
  const [libraryItems, setLibraryItems] = useState([])
  const [libraryLoading, setLibraryLoading] = useState(true)
  const [libraryError, setLibraryError] = useState('')
  const [libraryRetryKey, setLibraryRetryKey] = useState(0)
  const [activeLibraryTab, setActiveLibraryTab] = useState('favorite')
  const [userReviews, setUserReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [reviewsError, setReviewsError] = useState('')
  const [reviewsRetryKey, setReviewsRetryKey] = useState(0)
  const [userLists, setUserLists] = useState([])
  const [listsLoading, setListsLoading] = useState(true)
  const [listsError, setListsError] = useState('')
  const [userPosts, setUserPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [diaryEntries, setDiaryEntries] = useState([])
  const [diaryLoading, setDiaryLoading] = useState(true)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [avatarMessage, setAvatarMessage] = useState('')
  const [followers, setFollowers] = useState([])
  const [following, setFollowing] = useState([])
  const [followModal, setFollowModal] = useState('')
  const [followError, setFollowError] = useState('')
  const [libraryPrivacy, setLibraryPrivacy] = useState({ showFavorites: false, showWatched: false })
  const displayName = profile?.username || user?.displayName || 'Luma kullanıcısı'
  const avatarInitial = displayName.trim().charAt(0).toLocaleUpperCase('tr-TR') || 'L'
  const activeTab = LIBRARY_TABS.find((tab) => tab.key === activeLibraryTab) || LIBRARY_TABS[0]
  const watchedCount = libraryItems.filter((item) => item.watched).length
  const favoriteCount = libraryItems.filter((item) => item.favorite).length
  const visibleLibraryItems = useMemo(() => libraryItems
    .filter((item) => item[activeTab.key])
    .sort((first, second) => {
      const firstDate = timestampValue(first[activeTab.dateField]) || timestampValue(first.updatedAt)
      const secondDate = timestampValue(second[activeTab.dateField]) || timestampValue(second.updatedAt)
      return secondDate - firstDate
    }), [activeTab.dateField, activeTab.key, libraryItems])

  useEffect(() => {
    if (!user?.uid) return undefined

    setLibraryLoading(true)
    setLibraryError('')

    let unsubscribe
    try {
      unsubscribe = subscribeToUserLibrary(
        user.uid,
        (items) => {
          setLibraryItems(items)
          setLibraryLoading(false)
          setLibraryError('')
        },
        (subscriptionError) => {
          setLibraryError(subscriptionError.message || 'Kütüphane bilgileri yüklenemedi.')
          setLibraryLoading(false)
        }
      )
    } catch (subscriptionError) {
      setLibraryError(subscriptionError.message || 'Kütüphane bilgileri yüklenemedi.')
      setLibraryLoading(false)
    }

    return () => unsubscribe?.()
  }, [libraryRetryKey, user?.uid])

  useEffect(() => {
    if (!user?.uid) return undefined
    setReviewsLoading(true)
    setReviewsError('')
    const unsubscribe = subscribeToUserReviews(user.uid, (items) => {
      setUserReviews(items)
      setReviewsLoading(false)
    }, (subscriptionError) => {
      setReviewsError(subscriptionError.message || 'Yorumlar yüklenemedi.')
      setReviewsLoading(false)
    })
    return unsubscribe
  }, [reviewsRetryKey, user?.uid])

  useEffect(() => {
    if (!user?.uid) return undefined
    setListsLoading(true); setListsError('')
    return subscribeToUserLists(user.uid, (items) => { setUserLists(items); setListsLoading(false) }, (subscriptionError) => { setListsError(subscriptionError.message || 'Listeler yüklenemedi.'); setListsLoading(false) })
  }, [user?.uid])

  useEffect(() => user?.uid ? subscribeToLibraryPrivacy(user.uid, setLibraryPrivacy, () => setLibraryPrivacy({ showFavorites: false, showWatched: false })) : undefined, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return undefined
    setDiaryLoading(true)
    return subscribeToUserDiary(user.uid, (items) => { setDiaryEntries(items); setDiaryLoading(false) }, () => { setDiaryEntries([]); setDiaryLoading(false) })
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return undefined
    setPostsLoading(true)
    let active = true
    let requestId = 0
    const stop = subscribeToUserPosts(user.uid, async (items) => { const request = ++requestId; const enriched = await attachPostProfiles(items); if (active && request === requestId) { setUserPosts(enriched); setPostsLoading(false) } }, () => { if (active) { setUserPosts([]); setPostsLoading(false) } })
    return () => { active = false; stop?.() }
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return undefined
    const stopFollowers = subscribeToFollowers(user.uid, setFollowers, (subscriptionError) => setFollowError(subscriptionError.message))
    const stopFollowing = subscribeToFollowing(user.uid, setFollowing, (subscriptionError) => setFollowError(subscriptionError.message))
    return () => { stopFollowers?.(); stopFollowing?.() }
  }, [user?.uid])

  const openFollowList = async (type) => {
    const source = type === 'followers' ? followers : following
    const profileField = type === 'followers' ? 'followerUid' : 'followingUid'
    setFollowModal(type)
    setFollowError('')
    try {
      const enriched = await attachFollowProfiles(source, profileField)
      if (type === 'followers') setFollowers(enriched)
      else setFollowing(enriched)
    } catch (loadError) {
      setFollowError(loadError.message || 'Takip bilgileri yüklenemedi.')
    }
  }

  const openUsernameEditor = () => {
    setUsername(displayName)
    setUsernameError('')
    setUsernameSuccess('')
    setIsEditingUsername(true)
  }

  const closeUsernameEditor = () => {
    if (usernameSaving) return
    setIsEditingUsername(false)
    setUsernameError('')
  }

  const handleUsernameSubmit = async (event) => {
    event.preventDefault()
    setUsernameError('')

    const validationError = validateUsername(username)
    if (validationError) {
      setUsernameError(validationError)
      return
    }

    setUsernameSaving(true)
    try {
      await updateUsername(username)
      setUsernameSuccess('Kullanıcı adın güncellendi.')
      setIsEditingUsername(false)
    } catch (updateError) {
      setUsernameError(updateError.message || 'Kullanıcı adı güncellenemedi. Lütfen tekrar deneyin.')
    } finally {
      setUsernameSaving(false)
    }
  }

  return (
    <div className="profile-page-shell">
      <GlassCard className="profile-hero-card">
        <div className="profile-cover" />
        <div className="profile-hero-content">
          <UserAvatar profile={profile} user={user} name={displayName} className="profile-avatar" alt={`${displayName} profil avatarı`} />
          <div className="profile-hero-main">
            <div>
              <h1>{displayName}</h1>
              <div className="public-follow-stats own-profile-follow-stats">
                <button type="button" onClick={() => openFollowList('followers')}><strong>{followers.length}</strong> Takipçi</button>
                <button type="button" onClick={() => openFollowList('following')}><strong>{following.length}</strong> Takip</button>
              </div>
            </div>
            <div className="profile-edit-actions"><SecondaryButton type="button" onClick={() => { setAvatarMessage(''); setAvatarModalOpen(true) }} disabled={profileLoading || !profile}>Avatarı değiştir</SecondaryButton><SecondaryButton type="button" onClick={openUsernameEditor} disabled={profileLoading || !profile}>Kullanıcı adını düzenle</SecondaryButton></div>
          </div>
        </div>
        {profileLoading ? <p className="profile-sync-indicator">Profil bilgileri yükleniyor…</p> : null}
        {profileError ? <p className="auth-message auth-message-warning profile-username-success">{profileError}</p> : null}
        {usernameSuccess ? <p className="auth-message auth-message-success profile-username-success">{usernameSuccess}</p> : null}
        {avatarMessage ? <p className="auth-message auth-message-success profile-username-success">{avatarMessage}</p> : null}
        {followError ? <p className="auth-message auth-message-error profile-username-success">{followError}</p> : null}
        <div className="profile-follow-stats">
          <div><strong>{watchedCount}</strong><span>İzlendi</span></div>
          <div><strong>{userReviews.length}</strong><span>Yorum</span></div>
          <div><strong>{userLists.length}</strong><span>Liste</span></div>
          <div><strong>{favoriteCount}</strong><span>Favori</span></div>
          <div><strong>{diaryEntries.length}</strong><span>Diary</span></div>
        </div>
      </GlassCard>

      <div className="profile-grid">
        <section className="profile-section-card">
          <div className="section-heading">
            <h2>Kütüphanem</h2>
            <Link to="/settings">Gizliliği düzenle</Link>
          </div>
          <div className="profile-privacy-status"><span>Favoriler: <strong>{libraryPrivacy.showFavorites ? 'Herkese açık' : 'Gizli'}</strong></span><span>İzlenenler: <strong>{libraryPrivacy.showWatched ? 'Herkese açık' : 'Gizli'}</strong></span></div>
          <div className="profile-library-tabs" role="tablist" aria-label="Kütüphane bölümleri">
            {LIBRARY_TABS.map((tab) => {
              const itemCount = libraryItems.filter((item) => item[tab.key]).length
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeLibraryTab === tab.key}
                  className={`profile-library-tab${activeLibraryTab === tab.key ? ' active' : ''}`}
                  onClick={() => setActiveLibraryTab(tab.key)}
                >
                  {tab.label} <span>{itemCount}</span>
                </button>
              )
            })}
          </div>

          {libraryLoading ? (
            <div className="profile-library-skeleton" aria-label="Kütüphane yükleniyor">
              {Array.from({ length: 4 }).map((_, index) => <span key={index} className="skeleton-card" />)}
            </div>
          ) : libraryError ? (
            <ErrorState message={libraryError} onRetry={() => setLibraryRetryKey((current) => current + 1)} />
          ) : visibleLibraryItems.length ? (
            <div className="profile-library-grid" role="tabpanel">
              {visibleLibraryItems.map((item) => {
                const posterUrl = getTmdbImageUrl(item.posterPath, 'w342')
                const cardContent = (
                  <>
                    <div className="profile-library-poster">
                      {posterUrl ? <img src={posterUrl} alt={`${item.title} posteri`} loading="lazy" /> : <span aria-hidden="true">Luma</span>}
                    </div>
                    <div className="profile-library-copy">
                      <h3>{item.title || 'İsimsiz yapım'}</h3>
                      <p>{toYear(item.releaseDate)}</p>
                      <span className="profile-media-type">{item.mediaType === 'tv' ? 'Dizi' : 'Film'}</span>
                    </div>
                  </>
                )

                return (
                  <Link key={item.id} to={`/${item.mediaType}/${item.mediaId}`} className="profile-library-card">
                    {cardContent}
                  </Link>
                )
              })}
            </div>
          ) : (
            <EmptyState title={`${activeTab.label} boş`} message={activeTab.emptyMessage} />
          )}
        </section>

        <section className="profile-section-card">
          <div className="section-heading">
            <h2>Son Yorumlar</h2>
          </div>
          {reviewsLoading ? (
            <div className="profile-review-skeleton"><span className="skeleton-card" /><span className="skeleton-card" /></div>
          ) : reviewsError ? (
            <ErrorState message={reviewsError} onRetry={() => setReviewsRetryKey((value) => value + 1)} />
          ) : userReviews.length ? (
            <div className="profile-real-review-list">
              {userReviews.slice(0, 3).map((review) => (
                <article key={review.id} className="profile-real-review-card"><Link to={`/reviews/${review.id}`}><div><strong>{review.title}</strong><span>⭐ {review.rating}/5</span></div><p>{review.spoiler ? 'Bu yorum spoiler içeriyor.' : review.content.length > 100 ? `${review.content.slice(0, 100)}…` : review.content}</p><small>{reviewDate(review.createdAt)}</small></Link><ContentLikeButton type="review" contentId={review.id}/></article>
              ))}
            </div>
          ) : <EmptyState title="Yorumlar boş" message="Henüz yorum paylaşılmadı." />}
        </section>
      </div>

      <section className="profile-section-card profile-lists-section">
        <div className="section-heading"><h2>Son Listeler</h2></div>
        {listsLoading ? <div className="list-loading">Listeler yükleniyor…</div> : listsError ? <ErrorState message={listsError} /> : userLists.length ? <div className="profile-real-list-grid">{userLists.slice(0, 3).map((list) => <article key={list.id} className="profile-real-list-card"><Link to={`/lists/${list.id}`}><div><strong>{list.title}</strong><span>{list.isPublic ? 'Herkese açık' : 'Özel'}</span></div><p>{list.description || 'Açıklama eklenmedi.'}</p><small>{list.itemCount || 0} yapım</small></Link><ContentLikeButton type="list" contentId={list.id} enabled={list.isPublic === true}/></article>)}</div> : <EmptyState title="Listeler boş" message="Henüz liste oluşturulmadı." />}
      </section>

      <section className="profile-section-card profile-lists-section">
        <div className="section-heading"><h2>Aktiviteler</h2><Link to="/activity">Tümünü gör</Link></div>
        <ActivityFeed mode="own" uid={user.uid} max={6} />
      </section>

      <section className="profile-section-card profile-lists-section">
        <div className="section-heading"><h2>Gönderiler</h2></div>
        {postsLoading ? <div className="list-loading">Gönderiler yükleniyor…</div> : userPosts.length ? <div className="social-post-list">{userPosts.map((post) => <PostCard key={post.id} post={post} />)}</div> : <EmptyState title="Gönderiler boş" message="Henüz gönderi paylaşılmadı." />}
      </section>

      <section className="profile-section-card profile-lists-section">
        <div className="section-heading"><h2>Son İzlenenler</h2><Link to="/diary">Tüm günlüğü gör</Link></div>
        {diaryLoading ? <div className="list-loading">Günlük yükleniyor…</div> : diaryEntries.length ? <div className="diary-entry-list profile-diary-list">{diaryEntries.slice(0, 3).map((entry) => <DiaryEntry key={entry.id} entry={entry} />)}</div> : <EmptyState title="Günlük boş" message="Henüz günlük kaydı eklenmedi." />}
      </section>

      <UserCommunitiesSection uid={user.uid} max={6} />

      {isEditingUsername ? (
        <Modal
          title="Kullanıcı adını düzenle"
          footer={(
            <>
              <SecondaryButton type="button" onClick={closeUsernameEditor} disabled={usernameSaving}>Vazgeç</SecondaryButton>
              <PrimaryButton type="submit" form="username-edit-form" disabled={usernameSaving}>
                {usernameSaving ? 'Kaydediliyor…' : 'Kaydet'}
              </PrimaryButton>
            </>
          )}
        >
          <form id="username-edit-form" className="profile-username-form" onSubmit={handleUsernameSubmit}>
            {usernameError ? <p className="auth-message auth-message-error">{usernameError}</p> : null}
            <label className="auth-field">
              <span>Kullanıcı adı</span>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="elifks"
                autoComplete="username"
                disabled={usernameSaving}
              />
            </label>
            <p className="profile-username-hint">3–20 karakter; harfle başlamalı ve yalnızca harf, rakam veya alt çizgi içermeli.</p>
          </form>
        </Modal>
      ) : null}
      {avatarModalOpen ? <AvatarPickerModal currentPhotoURL={profile?.photoURL || ''} onClose={() => setAvatarModalOpen(false)} onSave={async (photoURL) => { const result = await updateAvatar(photoURL); setAvatarMessage(result.warning || (photoURL ? 'Avatarın güncellendi.' : 'Avatar kaldırıldı.')) }} /> : null}
      {followModal ? <FollowListModal title={followModal === 'followers' ? 'Takipçiler' : 'Takip edilenler'} items={followModal === 'followers' ? followers : following} empty={followModal === 'followers' ? 'Henüz takipçin yok.' : 'Henüz kimseyi takip etmiyorsun.'} onClose={() => setFollowModal('')} /> : null}
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { subscribeToUsers } from '../services/users'
import { searchProfilesByUsername } from '../services/profile'
import { attachFollowProfiles, subscribeToFollowers, subscribeToFollowing } from '../services/follows'
import { UserCard } from '../components/people/UserCard'
import { EmptyState } from '../components/shared/EmptyState'
import { ErrorState } from '../components/shared/ErrorState'
import { useSafety } from '../context/SafetyContext'

export function PeoplePage() {
  const { user, authLoading } = useAuth()
  const { blockedUids, mutedUids } = useSafety()
  const [tab, setTab] = useState('suggested')
  const [profiles, setProfiles] = useState([])
  const [following, setFollowing] = useState([])
  const [followers, setFollowers] = useState([])
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState('')
  const requestId = useRef(0)

  useEffect(() => subscribeToUsers((items) => { setProfiles(items); setLoading(false) }, (loadError) => { setError(loadError.message); setLoading(false) }, 20), [])
  useEffect(() => {
    if (!user?.uid) { setFollowing([]); setFollowers([]); return undefined }
    let active = true
    let followingRequest = 0
    let followersRequest = 0
    const stopFollowing = subscribeToFollowing(user.uid, async (items) => { const request = ++followingRequest; const enriched = await attachFollowProfiles(items, 'followingUid'); if (active && request === followingRequest) setFollowing(enriched) }, (loadError) => { if (active) setError(loadError.message) })
    const stopFollowers = subscribeToFollowers(user.uid, async (items) => { const request = ++followersRequest; const enriched = await attachFollowProfiles(items, 'followerUid'); if (active && request === followersRequest) setFollowers(enriched) }, (loadError) => { if (active) setError(loadError.message) })
    return () => { active = false; stopFollowing?.(); stopFollowers?.() }
  }, [user?.uid])

  useEffect(() => {
    const value = query.trim()
    const currentRequest = ++requestId.current
    if (value.length < 2) { setSearchResults([]); setSearchLoading(false); return undefined }
    const timer = setTimeout(async () => {
      setSearchLoading(true); setError('')
      try { const items = await searchProfilesByUsername(value, 20); if (requestId.current === currentRequest) setSearchResults(items) }
      catch (searchError) { if (requestId.current === currentRequest) setError(searchError.message) }
      finally { if (requestId.current === currentRequest) setSearchLoading(false) }
    }, 325)
    return () => clearTimeout(timer)
  }, [query])

  const followedUids = useMemo(() => new Set(following.map((item) => item.followingUid)), [following])
  const tabProfiles = tab === 'following' ? following.map((item) => item.profile).filter(Boolean) : tab === 'followers' ? followers.map((item) => item.profile).filter(Boolean) : profiles.filter((item) => item.uid !== user?.uid && !followedUids.has(item.uid))
  const visible = (query.trim().length >= 2 ? searchResults.filter((item) => item.uid !== user?.uid) : tabProfiles).filter((item)=>!blockedUids.has(item.uid)&&!mutedUids.has(item.uid))
  const emptyMessage = query.trim().length >= 2 ? 'Bu kullanıcı adına uygun bir profil bulunamadı.' : tab === 'following' ? 'Henüz kimseyi takip etmiyorsun.' : tab === 'followers' ? 'Henüz takipçin yok.' : 'Şu anda önerebileceğimiz başka bir kullanıcı yok.'

  return <div className="page-stack people-page"><section className="discover-hero-card genre-hero"><p className="eyebrow">Luma topluluğu</p><h1>Sinemaseverleri keşfet</h1><p>Yeni profiller keşfet, takip et ve sohbet başlat.</p></section><label className="people-search"><span className="sr-only">Kullanıcı ara</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Kullanıcı adıyla ara"/></label><div className="media-tabs" role="tablist">{[['suggested','Önerilenler'],['following','Takip Ettiklerin'],['followers','Takipçilerin']].map(([key,label]) => <button key={key} role="tab" aria-selected={tab===key} className={tab===key?'active':''} onClick={() => { setTab(key); setQuery('') }}>{label}</button>)}</div>{authLoading || loading || searchLoading ? <div className="list-loading">Kullanıcılar yükleniyor…</div> : error ? <ErrorState message={error}/> : !user && tab !== 'suggested' ? <EmptyState title="Giriş yapmalısın" message="Takip bağlantılarını görmek için giriş yap."/> : visible.length ? <div className="people-grid">{visible.map((profile) => <UserCard key={profile.uid} profile={profile} isFollowing={followedUids.has(profile.uid)}/>)}</div> : <EmptyState title="Kullanıcı bulunamadı" message={emptyMessage}/>}</div>
}

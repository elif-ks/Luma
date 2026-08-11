import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSafety } from '../../context/SafetyContext'
import { getMyCommunityMemberships, subscribeToCommunities, subscribeToCommunityFeed } from '../../services/communities'
import { getProfileByUid } from '../../services/profile'
import { CommunityPostCard } from './CommunityPostCard'
import { EmptyState } from '../shared/EmptyState'

const MAX_FEED_COMMUNITIES = 12
const POSTS_PER_COMMUNITY = 6

export function MyCommunitiesFeed({ limit = 100 }) {
  const { user, authLoading } = useAuth()
  const safety = useSafety()
  const [memberships, setMemberships] = useState([])
  const [communities, setCommunities] = useState([])
  const [posts, setPosts] = useState([])
  const [profiles, setProfiles] = useState({})
  const [membershipsLoading, setMembershipsLoading] = useState(false)
  const [postsLoading, setPostsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setMemberships([])
    setPosts([])
    setProfiles({})
    setError('')
    if (authLoading || !user?.uid) { setMembershipsLoading(authLoading); return () => { active = false } }
    setMembershipsLoading(true)
    getMyCommunityMemberships(user.uid)
      .then((items) => { if (active) setMemberships(items.slice(0, MAX_FEED_COMMUNITIES)) })
      .catch((loadError) => { if (active) setError(loadError.message) })
      .finally(() => { if (active) setMembershipsLoading(false) })
    return () => { active = false }
  }, [authLoading, user?.uid])

  useEffect(() => subscribeToCommunities(setCommunities, (loadError) => setError(loadError.message)), [])

  const communityIds = useMemo(() => memberships.map((item) => item.communityId), [memberships])
  useEffect(() => {
    setPosts([])
    if (!user?.uid || !communityIds.length) { setPostsLoading(false); return undefined }
    setPostsLoading(true)
    return subscribeToCommunityFeed(communityIds, (items) => { setPosts(items); setPostsLoading(false) }, (loadError) => { setError(loadError.message); setPostsLoading(false) }, {
      maxCommunities: MAX_FEED_COMMUNITIES,
      perCommunityLimit: POSTS_PER_COMMUNITY
    })
  }, [communityIds, user?.uid])

  const membershipMap = useMemo(() => Object.fromEntries(memberships.map((item) => [item.communityId, item])), [memberships])
  const communityMap = useMemo(() => Object.fromEntries(communities.map((item) => [item.id, item])), [communities])
  const visible = useMemo(() => posts.filter((item) => membershipMap[item.communityId] && communityMap[item.communityId] && !safety.blockedUids.has(item.ownerUid) && !safety.mutedUids.has(item.ownerUid)).slice(0, limit), [posts, membershipMap, communityMap, safety.blockedUids, safety.mutedUids, limit])

  useEffect(() => {
    let active = true
    const uids = [...new Set(visible.map((item) => item.ownerUid))]
    Promise.all(uids.map(async (uid) => [uid, await getProfileByUid(uid).catch(() => null)]))
      .then((items) => { if (active) setProfiles(Object.fromEntries(items)) })
    return () => { active = false }
  }, [visible.map((item) => item.ownerUid).join('|')])

  if (authLoading || membershipsLoading || postsLoading || safety.loading) return <div className="list-loading">Topluluk gönderileri yükleniyor…</div>
  if (!user) return <EmptyState title="Topluluklarım" message="Topluluk akışını görmek için giriş yap." />
  if (error) return <p className="auth-message auth-message-error">{error}</p>
  if (!memberships.length) return <section className="profile-section-card"><p>Katıldığın toplulukların yeni gönderileri burada görünecek.</p><Link to="/communities">Toplulukları keşfet</Link></section>
  if (!visible.length) return <section className="profile-section-card"><p>Katıldığın topluluklarda henüz yeni gönderi yok.</p><Link to="/communities">Topluluklara git</Link></section>

  return <div className="community-post-list">{visible.map((post) => <CommunityPostCard key={`${post.communityId}-${post.id}`} community={communityMap[post.communityId]} post={post} profile={profiles[post.ownerUid]} membership={membershipMap[post.communityId]} />)}</div>
}

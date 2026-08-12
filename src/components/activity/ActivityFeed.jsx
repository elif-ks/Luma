import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSafety } from '../../context/SafetyContext'
import { enrichActivities, subscribeToActivities, subscribeToUserActivities } from '../../services/activities'
import { subscribeToFollowing } from '../../services/follows'
import { ActivityCard } from './ActivityCard'
import { EmptyState } from '../shared/EmptyState'
import { ErrorState } from '../shared/ErrorState'

export function ActivityFeed({ mode = 'following', uid, max = 100, compact = false }) {
  const { user, authLoading } = useAuth()
  const safety = useSafety()
  const [activities, setActivities] = useState([])
  const [following, setFollowing] = useState([])
  const [activitiesReady, setActivitiesReady] = useState(false)
  const [followingReady, setFollowingReady] = useState(mode !== 'following')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    setActivities([])
    setFollowing([])
    setError('')
    setActivitiesReady(false)
    setFollowingReady(mode !== 'following')
    if (authLoading) return undefined
    if ((mode === 'following' || mode === 'own') && !user?.uid && !uid) {
      setActivitiesReady(true)
      setFollowingReady(true)
      return undefined
    }
    let active = true
    let request = 0
    const receive = async (items) => {
      const requestId = ++request
      const enriched = await enrichActivities(items)
      if (active && requestId === request) { setActivities(enriched); setActivitiesReady(true) }
    }
    const fail = (subscriptionError) => { if (active) { setActivities([]); setError(subscriptionError.message); setActivitiesReady(true); setFollowingReady(true) } }
    const activityUid = uid || (mode === 'own' ? user?.uid : '')
    const stopActivities = activityUid ? subscribeToUserActivities(activityUid, receive, fail, max) : subscribeToActivities(receive, fail, max)
    const stopFollowing = mode === 'following' ? subscribeToFollowing(user.uid, (items) => {
      if (!active) return
      setFollowing(items.map((item) => item.followingUid).filter((followingUid) => followingUid && followingUid !== user.uid))
      setFollowingReady(true)
    }, fail) : null
    return () => { active = false; stopActivities?.(); stopFollowing?.() }
  }, [authLoading, max, mode, retry, uid, user?.uid])

  const followedUidSet = useMemo(() => new Set(following), [following])
  const visible = useMemo(() => activities.filter((item) => {
    if (item.isListActivity && !item.source) return false
    if (safety.blockedUids.has(item.uid) || safety.mutedUids.has(item.uid)) return false
    if (mode === 'own') return item.uid === (uid || user?.uid)
    if (mode === 'following') return followedUidSet.has(item.uid) && item.uid !== user?.uid
    return true
  }).slice(0, compact ? 6 : max), [activities, compact, followedUidSet, max, mode, safety.blockedUids, safety.mutedUids, uid, user?.uid])

  if (!activitiesReady || !followingReady) return <div className="list-loading">Aktiviteler yükleniyor…</div>
  if (error) return <ErrorState message={error} onRetry={() => setRetry((value) => value + 1)}/>
  if (!visible.length) return <div className="activity-empty"><EmptyState title="Henüz aktivite yok" message={mode === 'following' ? 'Takip ettiğin kullanıcıların film aktiviteleri burada görünecek.' : 'Henüz herkese açık bir aktivite yok.'}/>{mode === 'following' ? <Link className="secondary-btn" to="/people">Kullanıcıları keşfet</Link> : null}</div>
  return <div className="activity-list">{visible.map((activity) => <ActivityCard key={activity.id} activity={activity}/>)}</div>
}

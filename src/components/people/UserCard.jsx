import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { followUser, unfollowUser } from '../../services/follows'
import { ensureConversation } from '../../services/messages'
import { UserAvatar } from '../shared/UserAvatar'
import { useSafety } from '../../context/SafetyContext'
import { SafetyMenu } from '../safety/SafetyMenu'

export function UserCard({ profile, isFollowing = false }) {
  const { user } = useAuth()
  const safety = useSafety()
  const navigate = useNavigate()
  const location = useLocation()
  const [followPending, setFollowPending] = useState(false)
  const [messagePending, setMessagePending] = useState(false)
  const [error, setError] = useState('')
  const ownCard = user?.uid === profile.uid
  const profilePath = `/profile/${encodeURIComponent(profile.username)}`
  const requireLogin = () => { navigate('/login', { state: { from: `${location.pathname}${location.search}` } }); return false }

  const toggleFollow = async () => {
    if (!user) return requireLogin()
    setFollowPending(true); setError('')
    try { if(safety.isBlocked(profile.uid))await safety.unblock(profile.uid);else if (isFollowing) await unfollowUser(user.uid, profile.uid); else await followUser(user.uid, profile.uid) }
    catch (actionError) { setError(actionError.message || 'Takip işlemi tamamlanamadı.') }
    finally { setFollowPending(false) }
  }

  const message = async () => {
    if (!user) return requireLogin()
    if(safety.isBlocked(profile.uid)){setError('Bu kullanıcıyla mesajlaşma engellendi.');return}setMessagePending(true); setError('')
    try { const id = await ensureConversation(user.uid, profile.uid); navigate(`/messages/${id}`) }
    catch (actionError) { setError(actionError.message || 'Konuşma başlatılamadı.') }
    finally { setMessagePending(false) }
  }

  return <article className="people-card">
    <SafetyMenu targetUid={profile.uid} targetType="user" targetId={profile.uid} compact />
    <Link to={profilePath} className="people-card-profile"><UserAvatar profile={profile} name={profile.username} className="people-card-avatar"/><div><h2>{profile.username}</h2><span>@{profile.username}</span></div></Link>
    <p className="people-card-bio">{profile.bio || 'Henüz bio eklenmedi.'}</p>
    {!ownCard ? <div className="people-card-actions"><button type="button" className={isFollowing||safety.isBlocked(profile.uid) ? 'following' : ''} disabled={followPending} onClick={toggleFollow}>{followPending ? 'İşleniyor…' : safety.isBlocked(profile.uid)?'Engeli kaldır':isFollowing ? 'Takiptesin' : 'Takip et'}</button>{!safety.isBlocked(profile.uid)?<button type="button" disabled={messagePending} onClick={message}>{messagePending ? 'Açılıyor…' : 'Mesaj'}</button>:null}</div> : null}
    {error ? <p className="auth-message auth-message-error">{error}</p> : null}
  </article>
}

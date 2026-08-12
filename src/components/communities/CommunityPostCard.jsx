import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSafety } from '../../context/SafetyContext'
import { deleteCommunityPost, setPostPinned, subscribeToPostLike, toggleCommunityPostLike } from '../../services/communities'
import { getTmdbImageUrl } from '../../services/tmdbHelpers'
import { ReportModal } from '../reports/ReportModal'
import { SpoilerContent } from '../shared/SpoilerContent'
import { UserAvatar } from '../shared/UserAvatar'
import { PostActionsMenu } from '../shared/PostActionsMenu'
import { CommunityPoll } from './CommunityPoll'
import { CommunityPostEditModal } from './CommunityPostEditModal'

function dateLabel(value) { const date = value?.toDate?.(); return date ? date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Şimdi' }
export function CommunityPostCard({ community, post, profile, membership, detail = false }) {
  const { user } = useAuth(); const navigate = useNavigate(); const safety = useSafety(); const [liked, setLiked] = useState(false); const [reportOpen, setReportOpen] = useState(false); const [editOpen, setEditOpen] = useState(false); const [pending, setPending] = useState(''); const [error, setError] = useState('')
  useEffect(() => subscribeToPostLike(community.id, post.id, user?.uid, setLiked), [community.id, post.id, user?.uid])
  if (safety.loading || safety.blockedUids.has(post.ownerUid)) return null
  const canModerate = ['owner', 'moderator'].includes(membership?.role); const canDelete = user?.uid === post.ownerUid || canModerate
  const like = async () => { if (!membership) { setError('Beğenmek için topluluğa katıl.'); return } setPending('like'); try { const result = await toggleCommunityPostLike(community.id, post.id, !liked); if (result?.warning) setError(result.warning) } catch (e) { setError(e.message) } finally { setPending('') } }
  const remove = async () => { if (!window.confirm('Bu gönderiyi silmek istediğine emin misin?')) return; setPending('delete'); try { await deleteCommunityPost(community.id, post.id) } catch (e) { setError(e.message) } finally { setPending('') } }
  const pin = async () => { setPending('pin'); try { await setPostPinned(community.id, post.id, !post.isPinned) } catch (e) { setError(e.message) } finally { setPending('') } }
  const detailPath = `/communities/${community.id}/posts/${post.id}`
  const actions = [
    ...(canModerate ? [{ key: 'pin', label: post.isPinned ? 'Sabitlemeyi kaldır' : 'Gönderiyi sabitle', disabled: Boolean(pending), onSelect: pin }] : []),
    ...(user?.uid === post.ownerUid && post.type === 'discussion' ? [{ key: 'edit', label: 'Düzenle', disabled: community.isArchived, onSelect: () => setEditOpen(true) }] : []),
    ...(canDelete ? [{ key: 'delete', label: pending === 'delete' ? 'Siliniyor…' : 'Sil', disabled: Boolean(pending), danger: true, onSelect: remove }] : []),
    ...(user?.uid !== post.ownerUid ? [{ key: 'report', label: 'Gönderiyi şikâyet et', onSelect: () => setReportOpen(true) }] : []),
  ]
  const openDetail = (event) => {
    if (detail || event.target.closest('a, button, input, textarea, select, [role="menu"], [role="menuitem"]')) return
    if (window.getSelection()?.toString()) return
    navigate(detailPath)
  }
  const openDetailWithKeyboard = (event) => {
    if (!detail && event.target === event.currentTarget && event.key === 'Enter') navigate(detailPath)
  }
  return <article className={`community-post-card${detail ? '' : ' post-card-clickable'}`} tabIndex={detail ? undefined : 0} role={detail ? undefined : 'link'} onClick={openDetail} onKeyDown={openDetailWithKeyboard}><header><Link to={profile?.username ? `/profile/${encodeURIComponent(profile.username)}` : '#'}><UserAvatar profile={profile} name={profile?.username || 'Luma kullanıcısı'} className="avatar-sm"/></Link><div><strong>{profile?.username || 'Luma kullanıcısı'}</strong><span>{dateLabel(post.createdAt)} · <Link to={`/communities/${community.id}`}>{community.name}</Link></span></div>{post.isPinned ? <span className="community-pinned">Sabitlendi</span> : null}<PostActionsMenu id={`community-${community.id}-${post.id}`} actions={actions}/></header><SpoilerContent id={post.id} spoiler={post.spoiler} warning="Bu gönderi spoiler içeriyor."><div><p className="community-post-text">{post.content}</p>{post.mediaKey ? <Link className="community-media" to={`/${post.mediaType}/${post.mediaId}`}>{post.posterPath ? <img src={getTmdbImageUrl(post.posterPath, 'w185')} alt=""/> : <span>L</span>}<strong>{post.mediaTitle}</strong></Link> : null}{post.type === 'poll' && post.pollId ? <CommunityPoll communityId={community.id} pollId={post.pollId} membership={membership} archived={community.isArchived}/> : null}</div></SpoilerContent><footer><button type="button" className={liked ? 'active' : ''} aria-pressed={liked} disabled={Boolean(pending) || community.isArchived} onClick={like}>♡ {post.likeCount || 0}</button><Link to={detailPath}>💬 {post.replyCount || 0}</Link></footer>{error ? <p className="auth-message auth-message-error">{error}</p> : null}{reportOpen ? <ReportModal targetType="community_post" targetId={post.id} parentId={community.id} onClose={() => setReportOpen(false)}/> : null}{editOpen ? <CommunityPostEditModal communityId={community.id} post={post} onClose={() => setEditOpen(false)}/> : null}</article>
}

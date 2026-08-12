import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { deletePost, setPostBookmark, setPostLike, setPostRepost, subscribeToBookmark, subscribeToReactions, subscribeToReplies } from '../../services/posts'
import { getMovieDetails, getTVDetails } from '../../services/tmdb'
import { getTmdbImageUrl, toYear } from '../../services/tmdbHelpers'
import { SafetyMenu } from '../safety/SafetyMenu'
import { PostActionsMenu } from '../shared/PostActionsMenu'

function formatTime(value) { const date = typeof value?.toDate === 'function' ? value.toDate() : null; if (!date) return 'Şimdi'; return `${date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} · ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` }

export function PostCard({ post, detail = false }) {
  const { user, profile } = useAuth(); const navigate = useNavigate(); const location = useLocation()
  const [likes, setLikes] = useState([]); const [reposts, setReposts] = useState([]); const [replyCount, setReplyCount] = useState(0); const [bookmarked, setBookmarked] = useState(false); const [pending, setPending] = useState(''); const [error, setError] = useState(''); const [revealed, setRevealed] = useState(!post.spoiler); const [media, setMedia] = useState(null)
  useEffect(() => { const stops = [subscribeToReactions(post.id, 'likes', setLikes, () => {}), subscribeToReactions(post.id, 'reposts', setReposts, () => {}), subscribeToReplies(post.id, (items) => setReplyCount(items.length), () => {})]; if (user?.uid) stops.push(subscribeToBookmark(post.id, user.uid, setBookmarked, () => {})); return () => stops.forEach((stop) => stop?.()) }, [post.id, user?.uid])
  useEffect(() => { if (!post.mediaKey) { setMedia(null); return }; const [type, id] = post.mediaKey.split('_'); (type === 'tv' ? getTVDetails(id) : getMovieDetails(id)).then((item) => setMedia({ ...item, media_type: type })).catch(() => setMedia(null)) }, [post.mediaKey])
  const requireLogin = () => { if (user) return true; navigate('/login', { state: { from: `${location.pathname}${location.search}` } }); return false }
  const react = async (type) => { if (!requireLogin()) return; setPending(type); setError(''); try { let result; if (type === 'like') result = await setPostLike(post.id, user.uid, !likes.includes(user.uid)); if (type === 'repost') result = await setPostRepost(post.id, user.uid, !reposts.includes(user.uid)); if (type === 'bookmark') result = await setPostBookmark(post.id, user.uid, !bookmarked); if (result?.warning) setError(result.warning) } catch (actionError) { setError(actionError.message) } finally { setPending('') } }
  const remove = async () => { if (!window.confirm('Gönderini silmek istediğine emin misin?')) return; setPending('delete'); try { await deletePost(post.id) } catch (deleteError) { setError(deleteError.message); setPending('') } }
  const liveProfile = user?.uid === post.ownerUid ? profile : post.authorProfile; const author = liveProfile?.username || 'Luma kullanıcısı'; const photo = liveProfile?.photoURL; const mediaTitle = media?.title || media?.name || media?.original_title || media?.original_name
  const detailPath = `/post/${post.id}`
  const openDetail = (event) => {
    if (detail || event.target.closest('a, button, input, textarea, select, [role="menu"], [role="menuitem"]')) return
    if (window.getSelection()?.toString()) return
    navigate(detailPath)
  }
  const openDetailWithKeyboard = (event) => {
    if (!detail && event.target === event.currentTarget && event.key === 'Enter') navigate(detailPath)
  }

  return <article className={`social-post-card${detail ? '' : ' post-card-clickable'}`} tabIndex={detail ? undefined : 0} role={detail ? undefined : 'link'} onClick={openDetail} onKeyDown={openDetailWithKeyboard}><header><div className="social-avatar">{photo ? <img src={photo} alt="" /> : author.charAt(0).toLocaleUpperCase('tr-TR')}</div><div><strong>{author}</strong><span>{formatTime(post.createdAt)}</span></div>{user?.uid === post.ownerUid ? <PostActionsMenu id={`social-${post.id}`} actions={[{ key: 'delete', label: pending === 'delete' ? 'Siliniyor…' : 'Sil', disabled: pending === 'delete', danger: true, onSelect: remove }]} /> : <SafetyMenu targetUid={post.ownerUid} targetType="post" targetId={post.id} compact />}</header><div className="social-post-content">{post.spoiler && !revealed ? <button type="button" className="social-spoiler" onClick={() => setRevealed(true)}>⚠ Spoiler içeriyor · Spoileri göster</button> : <p>{post.content}</p>}{media ? <Link to={`/${media.media_type}/${media.id}`} className="social-attached-media">{media.poster_path ? <img src={getTmdbImageUrl(media.poster_path, 'w185')} alt="" /> : <span className="media-fallback">L</span>}<div><strong>{mediaTitle}</strong><small>{toYear(media.release_date || media.first_air_date)} · {media.media_type === 'tv' ? 'Dizi' : 'Film'}</small></div></Link> : null}</div><div className="social-post-actions"><Link to={detailPath} aria-label="Cevapları aç">💬 {replyCount}</Link><button className={reposts.includes(user?.uid) ? 'active' : ''} disabled={Boolean(pending)} onClick={() => react('repost')}>↻ {reposts.length}</button><button className={likes.includes(user?.uid) ? 'active' : ''} disabled={Boolean(pending)} onClick={() => react('like')}>♡ {likes.length}</button><button className={bookmarked ? 'active' : ''} disabled={Boolean(pending)} onClick={() => react('bookmark')}>🔖</button></div>{error ? <p className="social-form-message error">{error}</p> : null}</article>
}

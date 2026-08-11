import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSafety } from '../context/SafetyContext'
import { attachPostProfiles, attachReplyProfiles, createReply, deleteReply, getPost, subscribeToReplies } from '../services/posts'
import { PostCard } from '../components/social/PostCard'
import { EmptyState } from '../components/shared/EmptyState'
import { ErrorState } from '../components/shared/ErrorState'
import { SpoilerContent } from '../components/shared/SpoilerContent'
import { UserAvatar } from '../components/shared/UserAvatar'

export function PostDetailPage() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const safety = useSafety()
  const navigate = useNavigate()
  const location = useLocation()
  const [post, setPost] = useState(null)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [content, setContent] = useState('')
  const [spoiler, setSpoiler] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')

  useEffect(() => {
    let active = true
    let replyRequest = 0
    getPost(id).then(async (item) => { if (active) setPost(item ? (await attachPostProfiles([item]))[0] : null) }).catch((loadError) => active && setError(loadError.message)).finally(() => active && setLoading(false))
    const stop = subscribeToReplies(id, async (items) => {
      const request = ++replyRequest
      const enriched = await attachReplyProfiles(items)
      if (active && request === replyRequest) setReplies(enriched)
    }, (loadError) => setError(loadError.message))
    return () => { active = false; stop() }
  }, [id])

  const submit = async (event) => {
    event.preventDefault()
    if (!user) { navigate('/login', { state: { from: `${location.pathname}${location.search}` } }); return }
    if (post?.ownerUid && safety.blockedUids.has(post.ownerUid)) { setError('Bu kullanıcıyla etkileşim kuramazsın.'); return }
    setSaving(true); setError(''); setNotice('')
    try { const result = await createReply(id, { ownerUid: user.uid, content, spoiler }); setContent(''); setSpoiler(false); if (result.warning) setNotice(result.warning) }
    catch (submitError) { setError(submitError.message) }
    finally { setSaving(false) }
  }

  const removeReply = async (reply) => {
    if (!window.confirm('Bu cevabı silmek istediğine emin misin?')) return
    setDeletingId(reply.id); setError(''); setNotice('')
    try { const result = await deleteReply(id, reply.id, reply.ownerUid); if (result.warning) setNotice(result.warning) }
    catch (removeError) { setError(removeError.message) }
    finally { setDeletingId('') }
  }

  if (loading) return <div className="list-loading">Gönderi yükleniyor…</div>
  if (error && !post) return <ErrorState message={error}/>
  if (!post) return <EmptyState title="Gönderi bulunamadı" message="Gönderi silinmiş veya artık erişilebilir değil."/>
  if (safety.blockedUids.has(post.ownerUid)) return <EmptyState title="Gönderi kullanılamıyor" message="Engellenen hesapların gönderileri gösterilmez."/>
  const visibleReplies = replies.filter((reply) => !safety.blockedUids.has(reply.ownerUid) && !safety.mutedUids.has(reply.ownerUid))

  return <div className="page-stack"><PostCard post={post} detail/><section className="profile-section-card"><h2>Cevaplar</h2><form className="social-reply-form" onSubmit={submit}><label><span className="sr-only">Cevabın</span><textarea value={content} maxLength={500} onChange={(event) => setContent(event.target.value)} placeholder="Sohbete katıl…"/></label><div><label><input type="checkbox" checked={spoiler} onChange={(event) => setSpoiler(event.target.checked)}/> Spoiler</label><span>{Array.from(content).length}/500</span><button disabled={saving || !content.trim()}>{saving ? 'Gönderiliyor…' : 'Cevapla'}</button></div></form>{error ? <p className="social-form-message error">{error}</p> : null}{notice ? <p className="social-form-message">{notice}</p> : null}<div className="social-replies">{visibleReplies.length ? visibleReplies.map((reply) => { const authorProfile = user?.uid === reply.ownerUid && profile ? profile : reply.authorProfile; const author = authorProfile?.username || 'Luma kullanıcısı'; const profilePath = authorProfile?.username ? `/profile/${encodeURIComponent(authorProfile.username)}` : ''; return <article key={reply.id}>{profilePath ? <Link to={profilePath} className="social-reply-avatar-link" aria-label={`${author} profiline git`}><UserAvatar profile={authorProfile} name={author} className="social-avatar" alt={`${author} profil avatarı`}/></Link> : <UserAvatar profile={authorProfile} name={author} className="social-avatar" alt={`${author} profil avatarı`}/>}<div>{profilePath ? <Link to={profilePath} className="social-reply-author-link"><strong>{author}</strong></Link> : <strong>{author}</strong>}<SpoilerContent id={reply.id} spoiler={reply.spoiler} warning="Bu cevap spoiler içeriyor.">{reply.content}</SpoilerContent>{user?.uid === reply.ownerUid ? <button type="button" className="social-delete" disabled={deletingId === reply.id} onClick={() => removeReply(reply)}>{deletingId === reply.id ? 'Siliniyor…' : 'Cevabı sil'}</button> : null}</div></article> }) : <p>Henüz cevap yok.</p>}</div></section></div>
}

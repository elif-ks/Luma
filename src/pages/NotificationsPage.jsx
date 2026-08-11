import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { getCachedReviewProfile } from '../services/reviews'
import { useNotifications } from '../context/NotificationContext'
import { notificationTargetPath } from '../services/notifications'
import { UserAvatar } from '../components/shared/UserAvatar'
import { EmptyState } from '../components/shared/EmptyState'
import { ErrorState } from '../components/shared/ErrorState'
import { PrimaryButton } from '../design-system'

const LABELS = { follow: 'Seni takip etmeye başladı.', post_like: 'Gönderini beğendi.', post_reply: 'Gönderine cevap verdi.', repost: 'Gönderini yeniden paylaştı.', review_like: 'İncelemeni beğendi.', list_like: 'Listeni beğendi.', list_member: 'Seni ortak bir listeye ekledi.', community_post_like: 'Topluluk gönderini beğendi.', community_post_reply: 'Topluluk gönderine cevap verdi.' }
const millis = (value) => typeof value?.toMillis === 'function' ? value.toMillis() : 0

async function enrich(item) {
  const actorProfile = await getCachedReviewProfile(item.actorUid).catch(() => null)
  if (item.targetType === 'community_post') {
    const community = await getDoc(doc(db, 'communities', item.targetId)).then((snapshot) => snapshot.exists() ? snapshot.data() : null).catch(() => null)
    const post = await getDoc(doc(db, 'communities', item.targetId, 'posts', item.sourceId || '_')).then((snapshot) => snapshot.exists() ? snapshot.data() : null).catch(() => null)
    const replyAvailable = item.type !== 'community_post_reply' || await getDoc(doc(db, 'communities', item.targetId, 'posts', item.sourceId || '_', 'replies', item.contextId || '_')).then((snapshot) => snapshot.exists()).catch(() => false)
    return { ...item, actorProfile, available: Boolean(community?.isPublic && post && replyAvailable), unavailableMessage: 'Bu içerik artık kullanılamıyor.' }
  }
  if (item.targetType === 'user') return { ...item, actorProfile, available: Boolean(actorProfile) }
  const root = item.targetType === 'post' ? 'posts' : item.targetType === 'review' ? 'reviews' : item.targetType === 'conversation' ? 'conversations' : 'lists'
  const source = await getDoc(doc(db, root, item.targetId)).then((snapshot) => snapshot.exists() ? snapshot.data() : null).catch(() => null)
  const replyAvailable = item.type !== 'post_reply' || await getDoc(doc(db, 'posts', item.targetId, 'replies', item.sourceId || '_')).then((snapshot) => snapshot.exists()).catch(() => false)
  const messageAvailable = item.type !== 'message' || await getDoc(doc(db, 'conversations', item.targetId, 'messages', item.sourceId || '_')).then((snapshot) => snapshot.exists()).catch(() => false)
  const available = Boolean(source && replyAvailable && messageAvailable && (item.targetType !== 'list' || source.isPublic === true || item.type === 'list_member'))
  return { ...item, actorProfile, available, unavailableMessage: item.type === 'message' ? 'Bu konuşma artık kullanılamıyor.' : 'Bu içerik artık kullanılamıyor.' }
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const notificationsState = useNotifications()
  const generalNotifications = notificationsState.notifications.filter((item) => item.type !== 'message')
  const [items, setItems] = useState([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { let active = true; Promise.all(generalNotifications.map(enrich)).then((value) => { if (active) setItems(value) }); return () => { active = false } }, [notificationsState.notifications])
  const open = async (item) => {
    setError('')
    try { if (!item.read) await notificationsState.markRead(item.id) } catch (readError) { setError(readError.message) }
    if (!item.available) return
    if (item.targetType === 'user' && item.actorProfile?.username) navigate(`/profile/${encodeURIComponent(item.actorProfile.username)}`)
    else if (item.targetType === 'post' || item.targetType === 'conversation' || item.targetType === 'community_post') navigate(notificationTargetPath(item) || `/post/${item.targetId}`)
    else if (item.targetType === 'review') navigate(`/reviews/${item.targetId}`)
    else if (item.targetType === 'list') navigate(`/lists/${item.targetId}`)
  }
  const markAll = async () => { setPending(true); setError(''); try { await notificationsState.markAllRead() } catch (actionError) { setError(actionError.message) } finally { setPending(false) } }
  if (notificationsState.loading) return <div className="list-loading">Bildirimler yükleniyor…</div>
  if (notificationsState.error) return <ErrorState message={notificationsState.error}/>
  return <div className="page-stack"><section className="review-hero-card notification-hero"><div><p className="eyebrow">Luma sosyal</p><h1>Bildirimler</h1><p>{notificationsState.unreadCount} okunmamış bildirim</p></div><PrimaryButton onClick={markAll} disabled={pending || notificationsState.unreadCount === 0}>{pending ? 'İşaretleniyor…' : 'Tümünü okundu işaretle'}</PrimaryButton></section>{error ? <p className="auth-message auth-message-error">{error}</p> : null}{items.length ? <section className="notification-list">{items.sort((a,b)=>millis(b.createdAt)-millis(a.createdAt)).map((item) => <button type="button" key={item.id} className={`notification-card${item.read ? '' : ' unread'}`} onClick={() => open(item)}><UserAvatar profile={item.actorProfile} name={item.actorProfile?.username || 'Luma kullanıcısı'} className="avatar"/><span className="notification-copy"><strong>{item.actorProfile?.username || 'Luma kullanıcısı'}</strong><span>{LABELS[item.type] || 'Yeni bir bildirimin var.'}</span>{!item.available ? <small>{item.unavailableMessage}</small> : null}</span><time>{millis(item.createdAt) ? new Date(millis(item.createdAt)).toLocaleString('tr-TR') : 'Şimdi'}</time>{!item.read ? <span className="notification-dot" aria-label="Okunmamış"/> : null}</button>)}</section> : <EmptyState title="Bildirimler boş" message="Henüz bildirimin yok."/>}</div>
}

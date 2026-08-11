import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, writeBatch, setDoc } from 'firebase/firestore'
import { db, getFirebaseAuth } from './firebase'

export const NOTIFICATION_TYPES = ['follow', 'post_like', 'post_reply', 'repost', 'review_like', 'list_like', 'list_member', 'message', 'community_post_like', 'community_post_reply']

export function isValidNotificationSourceId(sourceId) {
  const value = String(sourceId || '').trim()
  return value.length > 0 && value.length <= 1500 && !value.includes('/')
}

export function notificationIdFor(type, targetId, actorUid, sourceId = '') {
  if (type === 'follow') return `follow_${actorUid}`
  if (type === 'post_like') return `postLike_${targetId}_${actorUid}`
  if (type === 'post_reply') {
    if (!isValidNotificationSourceId(sourceId)) throw new Error('Cevap bildirimi için geçerli bir cevap kimliği gerekli.')
    return `postReply_${targetId}_${sourceId}`
  }
  if (type === 'repost') return `repost_${targetId}_${actorUid}`
  if (type === 'review_like') return `reviewLike_${targetId}_${actorUid}`
  if (type === 'list_like') return `listLike_${targetId}_${actorUid}`
  if (type === 'list_member') return `listMember_${targetId}`
  if (type === 'community_post_like') return `communityPostLike_${targetId}_${sourceId}_${actorUid}`
  if (type === 'community_post_reply') return `communityPostReply_${targetId}_${sourceId}`
  if (type === 'message') {
    if (!isValidNotificationSourceId(sourceId)) throw new Error('Mesaj bildirimi için geçerli bir mesaj kimliği gerekli.')
    return `message_${targetId}`
  }
  throw new Error('Geçersiz bildirim türü.')
}

function notificationError(error) {
  const code = String(error?.code || '').replace(/^firestore\//, '')
  const messages = { 'permission-denied': 'Bu bildirim işlemini yapmaya yetkiniz yok.', unauthenticated: 'Bildirimler için giriş yapmalısınız.', unavailable: 'Bildirim servisine şu anda ulaşılamıyor.', 'failed-precondition': 'Bildirim sorgusu için gerekli Firestore indeksi hazır değil.', 'deadline-exceeded': 'Bildirim işlemi zaman aşımına uğradı.' }
  const mapped = new Error(messages[code] || 'Bildirim işlemi tamamlanamadı.')
  mapped.code = error?.code || 'notifications/unknown'
  return mapped
}

export async function createNotification({ recipientUid, type, targetType, targetId, sourceId = '' }) {
  const actorUid = getFirebaseAuth().currentUser?.uid
  if (!actorUid) throw notificationError({ code: 'unauthenticated' })
  if (!recipientUid || recipientUid === actorUid) return null
  const notificationId = notificationIdFor(type, String(targetId), actorUid, sourceId)
  const payload = { type, actorUid, targetType, targetId: String(targetId), read: false, readAt: null, createdAt: serverTimestamp() }
  if (type === 'post_reply' || type === 'message') payload.sourceId = String(sourceId)
  try {
    await setDoc(doc(db, 'users', recipientUid, 'notifications', notificationId), payload)
    return notificationId
  } catch (error) { throw notificationError(error) }
}

export async function removeNotification({ recipientUid, type, targetId, actorUid = getFirebaseAuth().currentUser?.uid, sourceId = '' }) {
  if (!recipientUid || !actorUid) return
  try { await deleteDoc(doc(db, 'users', recipientUid, 'notifications', notificationIdFor(type, String(targetId), actorUid, sourceId))) }
  catch (error) { throw notificationError(error) }
}

export function createReplyNotification({ recipientUid, postId, replyId }) {
  if (!isValidNotificationSourceId(replyId)) throw new Error('Cevap bildirimi için geçerli bir cevap kimliği gerekli.')
  return createNotification({ recipientUid, type: 'post_reply', targetType: 'post', targetId: postId, sourceId: replyId })
}

export function removeReplyNotification({ recipientUid, postId, replyId, actorUid }) {
  if (!isValidNotificationSourceId(replyId)) throw new Error('Silinecek cevap bildiriminin kimliği geçersiz.')
  return removeNotification({ recipientUid, type: 'post_reply', targetId: postId, sourceId: replyId, actorUid })
}

export function notificationTargetPath(notification) {
  if (notification?.type === 'community_post_like' && notification.targetId && notification.sourceId) return `/communities/${encodeURIComponent(notification.targetId)}/posts/${encodeURIComponent(notification.sourceId)}`
  if (notification?.type === 'community_post_reply' && notification.targetId && notification.sourceId && notification.contextId) return `/communities/${encodeURIComponent(notification.targetId)}/posts/${encodeURIComponent(notification.sourceId)}`
  if (notification?.type === 'post_reply' && notification.targetType === 'post' && notification.targetId && notification.sourceId) return `/post/${encodeURIComponent(notification.targetId)}`
  if (notification?.type === 'message' && notification.targetType === 'conversation' && notification.targetId && notification.sourceId) return `/messages/${encodeURIComponent(notification.targetId)}`
  return null
}

export async function createCommunityPostNotification({ recipientUid, type, communityId, postId, replyId = '' }) {
  const actorUid = getFirebaseAuth().currentUser?.uid
  if (!actorUid || !recipientUid || recipientUid === actorUid) return null
  const notificationId = type === 'community_post_like' ? `communityPostLike_${communityId}_${postId}_${actorUid}` : `communityPostReply_${communityId}_${postId}_${replyId}`
  const payload = { type, actorUid, targetType: 'community_post', targetId: String(communityId), sourceId: String(postId), read: false, readAt: null, createdAt: serverTimestamp() }
  if (type === 'community_post_reply') payload.contextId = String(replyId)
  try { await setDoc(doc(db, 'users', recipientUid, 'notifications', notificationId), payload); return notificationId } catch (error) { throw notificationError(error) }
}

export async function removeCommunityPostNotification({ recipientUid, type, communityId, postId, actorUid = getFirebaseAuth().currentUser?.uid, replyId = '' }) {
  if (!recipientUid || !actorUid) return
  const notificationId = type === 'community_post_like' ? `communityPostLike_${communityId}_${postId}_${actorUid}` : `communityPostReply_${communityId}_${postId}_${replyId}`
  try { await deleteDoc(doc(db, 'users', recipientUid, 'notifications', notificationId)) } catch (error) { throw notificationError(error) }
}

export async function upsertMessageNotification({ recipientUid, conversationId, messageId }) {
  const actorUid = getFirebaseAuth().currentUser?.uid
  if (!actorUid) throw notificationError({ code: 'unauthenticated' })
  if (!recipientUid || recipientUid === actorUid) return null
  if (!isValidNotificationSourceId(messageId) || !String(conversationId || '').trim()) throw new Error('Mesaj bildirimi için geçerli konuşma ve mesaj kimliği gerekli.')
  const notificationId = notificationIdFor('message', String(conversationId), actorUid, messageId)
  try {
    await setDoc(doc(db, 'users', recipientUid, 'notifications', notificationId), { type: 'message', actorUid, targetType: 'conversation', targetId: String(conversationId), sourceId: String(messageId), read: false, readAt: null, createdAt: serverTimestamp() })
    return notificationId
  } catch (error) { throw notificationError(error) }
}

export function subscribeToNotifications(uid, onChange, onError) {
  if (!uid) { onChange([]); return () => {} }
  return onSnapshot(query(collection(db, 'users', uid, 'notifications'), orderBy('createdAt', 'desc'), limit(50)), (snapshot) => onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), (error) => onError?.(notificationError(error)))
}

export function subscribeToMessageNotifications(uid, onChange, onError) {
  if (!uid) { onChange([]); return () => {} }
  return onSnapshot(query(collection(db, 'users', uid, 'notifications'), where('type', '==', 'message'), limit(100)), (snapshot) => onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), (error) => onError?.(notificationError(error)))
}

export async function markNotificationRead(uid, notificationId, read = true) {
  if (getFirebaseAuth().currentUser?.uid !== uid) throw notificationError({ code: 'permission-denied' })
  try { await updateDoc(doc(db, 'users', uid, 'notifications', notificationId), { read, readAt: read ? serverTimestamp() : null }) }
  catch (error) { throw notificationError(error) }
}

export async function markNotificationsRead(uid, notifications) {
  if (getFirebaseAuth().currentUser?.uid !== uid) throw notificationError({ code: 'permission-denied' })
  const unread = notifications.filter((item) => !item.read)
  try {
    for (let offset = 0; offset < unread.length; offset += 450) {
      const batch = writeBatch(db)
      unread.slice(offset, offset + 450).forEach((item) => batch.update(doc(db, 'users', uid, 'notifications', item.id), { read: true, readAt: serverTimestamp() }))
      await batch.commit()
    }
  } catch (error) { throw notificationError(error) }
}

export async function deleteNotification(uid, notificationId) {
  if (getFirebaseAuth().currentUser?.uid !== uid) throw notificationError({ code: 'permission-denied' })
  try { await deleteDoc(doc(db, 'users', uid, 'notifications', notificationId)) }
  catch (error) { throw notificationError(error) }
}

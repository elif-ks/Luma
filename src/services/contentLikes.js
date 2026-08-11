import { collection, deleteDoc, doc, getDoc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db, getCurrentUser } from './firebase'

const PATHS = { review: 'reviews', list: 'lists' }

function likeError(error) {
  const code = String(error?.code || '').replace(/^firestore\//, '')
  const messages = {
    'permission-denied': 'Bu içeriği beğenme yetkiniz yok.',
    unauthenticated: 'Beğenmek için giriş yapmalısınız.',
    unavailable: 'Beğeni servisine şu anda ulaşılamıyor.'
  }
  return new Error(messages[code] || error?.message || 'Beğeni işlemi tamamlanamadı. Lütfen tekrar deneyin.')
}

function likesCollection(type, contentId) {
  const root = PATHS[type]
  if (!root || !contentId) throw new Error('Geçersiz beğeni hedefi.')
  return collection(db, root, contentId, 'likes')
}

export function subscribeToContentLikes(type, contentId, currentUid, onChange, onError) {
  try {
    return onSnapshot(likesCollection(type, contentId), (snapshot) => {
      const ids = snapshot.docs.map((item) => item.id)
      onChange({ count: ids.length, liked: Boolean(currentUid && ids.includes(currentUid)) })
    }, (error) => onError?.(likeError(error)))
  } catch (error) {
    onError?.(likeError(error))
    return () => {}
  }
}

export async function setContentLike(type, contentId, uid, active) {
  const currentUser = getCurrentUser()
  if (!currentUser || currentUser.uid !== uid) throw new Error('Beğenmek için kendi hesabınızla giriş yapmalısınız.')
  const reference = doc(likesCollection(type, contentId), uid)
  try {
    const parentReference = doc(db, PATHS[type], contentId)
    const parentSnapshot = await getDoc(parentReference)
    if (!parentSnapshot.exists()) throw new Error('Beğenilecek içerik artık mevcut değil.')
    if (active) {
      await runTransaction(db, async (transaction) => {
        const parent = await transaction.get(parentReference)
        if (!parent.exists()) throw new Error('Beğenilecek içerik artık mevcut değil.')
        if (type === 'list' && parent.data().isPublic !== true) throw new Error('Yalnızca herkese açık listeler beğenilebilir.')
        transaction.set(reference, { uid, createdAt: serverTimestamp() })
      })
    } else await deleteDoc(reference)
    const recipientUid = type === 'review' ? parentSnapshot.data().uid : parentSnapshot.data().ownerUid
    if (recipientUid && recipientUid !== uid) {
      const notificationType = type === 'review' ? 'review_like' : 'list_like'
      try {
        const notifications = await import('./notifications')
        if (active) await notifications.createNotification({ recipientUid, type: notificationType, targetType: type, targetId: contentId })
        else await notifications.removeNotification({ recipientUid, type: notificationType, targetId: contentId, actorUid: uid })
      } catch (notificationError) {
        if (import.meta.env.DEV) console.error(`[notification:${type}-like-${active ? 'create' : 'delete'}]`, notificationError)
        return { warning: 'İşlem tamamlandı ancak bildirim gönderilemedi.' }
      }
    }
    return { warning: '' }
  } catch (error) {
    throw likeError(error)
  }
}

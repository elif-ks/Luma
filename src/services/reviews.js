import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './firebase'
import { getProfileByUid } from './profile'

const profileCache = new Map()

function reviewError(error) {
  const code = String(error?.code || '').replace(/^firestore\//, '')
  const messages = {
    'permission-denied': 'Bu yorum işlemini yapmaya yetkiniz yok.',
    unauthenticated: 'Yorum işlemi için giriş yapmalısınız.',
    unavailable: 'Yorum servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin.',
    aborted: 'Yorum aynı anda güncellendi. Lütfen tekrar deneyin.',
    'deadline-exceeded': 'Yorum işlemi zaman aşımına uğradı. Lütfen tekrar deneyin.'
  }
  const mapped = new Error(messages[code] || 'Yorum işlemi tamamlanamadı. Lütfen tekrar deneyin.')
  mapped.code = error?.code || 'reviews/unknown'
  return mapped
}

function timestampValue(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (typeof value?.seconds === 'number') return value.seconds * 1000
  return 0
}

function newestFirst(items) {
  return [...items].sort((a, b) => timestampValue(b.createdAt) - timestampValue(a.createdAt))
}

function assertReview(review) {
  if (!review?.uid) throw new Error('Yorum işlemi için giriş yapmalısınız.')
  if (!['movie', 'tv'].includes(review.mediaType)) throw new Error('Geçersiz medya türü.')
  if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) throw new Error('Puan 1–5 arasında olmalı.')
  const contentLength = Array.from(String(review.content || '').trim()).length
  if (contentLength < 10 || contentLength > 2000) throw new Error('Yorum 10–2000 karakter arasında olmalı.')
}

export function getReviewDocumentId(uid, mediaType, mediaId) {
  return `${uid}*${mediaType}*${String(mediaId)}`
}

export async function getUserMediaReview(uid, mediaType, mediaId) {
  if (!uid) return null
  try {
    const snapshot = await getDoc(doc(db, 'reviews', getReviewDocumentId(uid, mediaType, mediaId)))
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
  } catch (error) {
    throw reviewError(error)
  }
}

export async function getReviewById(reviewId) {
  if (!reviewId) return null
  try {
    const snapshot = await getDoc(doc(db, 'reviews', reviewId))
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
  } catch (error) {
    throw reviewError(error)
  }
}

export async function saveReview(review) {
  const content = String(review.content || '').trim()
  const payload = { ...review, mediaId: String(review.mediaId), content, rating: Number(review.rating), spoiler: Boolean(review.spoiler) }
  assertReview(payload)
  const reference = doc(db, 'reviews', getReviewDocumentId(payload.uid, payload.mediaType, payload.mediaId))

  try {
    const result = await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reference)
      const data = {
        uid: payload.uid,
        mediaKey: `${payload.mediaType}_${payload.mediaId}`,
        mediaId: payload.mediaId,
        mediaType: payload.mediaType,
        title: String(payload.title || ''),
        posterPath: String(payload.posterPath || ''),
        releaseDate: String(payload.releaseDate || ''),
        rating: payload.rating,
        content,
        spoiler: payload.spoiler,
        createdAt: snapshot.exists() ? snapshot.data().createdAt : serverTimestamp(),
        updatedAt: serverTimestamp()
      }
      transaction.set(reference, data)
      return { id: reference.id, ...data, wasCreated: !snapshot.exists() }
    })
    if (result.wasCreated) {
      try {
        const { createActivity } = await import('./activities')
        await createActivity({ uid: payload.uid, type: 'review', targetType: 'review', targetId: reference.id, mediaKey: result.mediaKey })
      } catch (activityError) {
        if (import.meta.env.DEV) console.error('[activity:review-create]', { code: activityError.code, message: activityError.message, activityId: activityError.activityId, payload: activityError.payload })
        result.activityWarning = 'İnceleme kaydedildi ancak aktivite akışında paylaşılamadı.'
      }
    }
    return result
  } catch (error) {
    throw reviewError(error)
  }
}

export async function deleteReview(uid, mediaType, mediaId) {
  try {
    const reviewId = getReviewDocumentId(uid, mediaType, mediaId)
    await deleteDoc(doc(db, 'reviews', reviewId))
    try { const { deleteActivity } = await import('./activities'); await deleteActivity(uid, 'review', reviewId) }
    catch (activityError) { console.warn('İnceleme silindi ancak aktivitesi kaldırılamadı.', activityError) }
  } catch (error) {
    throw reviewError(error)
  }
}

function subscribeFiltered(filter, onChange, onError, limit) {
  return onSnapshot(collection(db, 'reviews'), (snapshot) => {
    const reviews = newestFirst(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).filter(filter))
    onChange(typeof limit === 'number' ? reviews.slice(0, limit) : reviews)
  }, (error) => onError?.(reviewError(error)))
}

export function subscribeToMediaReviews(mediaType, mediaId, onChange, onError) {
  const id = String(mediaId)
  return subscribeFiltered((review) => review.mediaType === mediaType && review.mediaId === id, onChange, onError)
}

export function subscribeToUserReviews(uid, onChange, onError) {
  return subscribeFiltered((review) => review.uid === uid, onChange, onError)
}

export function subscribeToLatestReviews(onChange, onError, limit = 20) {
  return subscribeFiltered(() => true, onChange, onError, limit)
}

export async function getCachedReviewProfile(uid) {
  if (!uid) return null
  if (!profileCache.has(uid)) {
    profileCache.set(uid, getProfileByUid(uid).catch((error) => {
      profileCache.delete(uid)
      throw error
    }))
  }
  return profileCache.get(uid)
}

export async function attachReviewProfiles(reviews) {
  return Promise.all(reviews.map(async (review) => ({
    ...review,
    authorProfile: await getCachedReviewProfile(review.uid)
  })))
}

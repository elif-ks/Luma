import { collection, deleteDoc, doc, documentId, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db } from './firebase'
import { getCachedReviewProfile } from './reviews'
import { getFirebaseAuth } from './firebase'
import { getMovieDetails, getTVDetails } from './tmdb'

const TYPES = new Set(['watched', 'review', 'list'])

function activityError(error, stage = 'operation') {
  const code = String(error?.code || '').replace(/^firestore\//, '')
  if (import.meta.env.DEV) console.error(`[activity:${stage}]`, { code: error?.code, message: error?.message })
  const messages = {
    'permission-denied': 'Bu aktivite işlemini yapmaya yetkiniz yok.',
    unauthenticated: 'Aktivite işlemi için giriş yapmalısınız.',
    unavailable: 'Aktivite akışına şu anda ulaşılamıyor.',
    'deadline-exceeded': 'Aktivite işlemi zaman aşımına uğradı.',
    'failed-precondition': 'Aktivite akışı şu anda yüklenemiyor.'
  }
  const mapped = new Error(messages[code] || 'Aktivite işlemi tamamlanamadı.')
  mapped.code = error?.code || 'activities/unknown'
  return mapped
}

export const activityIdFor = (type, sourceId) => `${type === 'watched' ? 'diary' : type}_${sourceId}`

export async function createActivity({ uid, type, targetType, targetId, mediaKey = '' }) {
  if (!uid) throw activityError({ code: 'unauthenticated' })
  if (getFirebaseAuth().currentUser?.uid !== uid) throw activityError({ code: 'permission-denied' })
  if (!TYPES.has(type)) throw new Error('Desteklenmeyen aktivite türü.')
  const activityId = activityIdFor(type, targetId)
  const payload = {
    uid,
    type,
    targetType: String(targetType),
    targetId: String(targetId),
    mediaKey: String(mediaKey || ''),
    visibility: 'public',
    createdAt: serverTimestamp()
  }
  try {
    const reference = doc(db, 'activities', activityId)
    await setDoc(reference, payload)
    return activityId
  } catch (error) {
    const mapped = activityError(error)
    mapped.activityId = activityId
    mapped.payload = { ...payload, createdAt: 'serverTimestamp()' }
    throw mapped
  }
}

export async function deleteActivity(uid, type, sourceId) {
  if (!uid || !sourceId) return
  if (getFirebaseAuth().currentUser?.uid !== uid) throw activityError({ code: 'permission-denied' })
  try { await deleteDoc(doc(db, 'activities', activityIdFor(type, sourceId))) }
  catch (error) {
    if (String(error?.code || '').includes('not-found')) return
    throw activityError(error)
  }
}

function logLegacyListActivity(stage, error, schema = 'unknown') {
  if (!import.meta.env.DEV) return
  console.warn('[activity:list-cleanup]', {
    stage,
    schema,
    code: error?.code || 'unknown'
  })
}

export async function tryDeleteListActivity(ownerUid, listId) {
  const authUid = getFirebaseAuth().currentUser?.uid
  if (!ownerUid || !listId || authUid !== ownerUid) {
    logLegacyListActivity('owner-mismatch', { code: 'activities/owner-mismatch' })
    return { status: 'skipped', reason: 'owner-mismatch' }
  }

  const activityId = activityIdFor('list', listId)
  let snapshot
  try {
    snapshot = await getDocs(query(
      collection(db, 'activities'),
      where(documentId(), '==', activityId),
      where('visibility', '==', 'public'),
      limit(1)
    ))
  } catch (error) {
    logLegacyListActivity('lookup-failed', error)
    return { status: 'skipped', reason: 'lookup-failed' }
  }

  const activityDocument = snapshot.docs.find((item) => item.id === activityId)
  if (!activityDocument) return { status: 'missing' }

  const data = activityDocument.data()
  const isLegacy = !data.uid && Boolean(data.actorUid || data.sourceId || data.sourceType)
  const storedOwnerUid = isLegacy ? data.actorUid : data.uid
  if (!storedOwnerUid || storedOwnerUid !== authUid) {
    logLegacyListActivity('document-owner-mismatch', { code: 'activities/document-owner-mismatch' }, isLegacy ? 'legacy' : 'current')
    return { status: 'skipped', reason: 'document-owner-mismatch' }
  }

  try {
    await deleteDoc(activityDocument.ref)
    return { status: 'deleted', schema: isLegacy ? 'legacy' : 'current' }
  } catch (error) {
    // Legacy belgelerde yalnızca actorUid bulunabilir. Güncel Rules silme için
    // resource.data.uid istediğinden bu belgeyi istemciden zorlamadan bırakırız.
    logLegacyListActivity('delete-failed', error, isLegacy ? 'legacy' : 'current')
    return { status: 'skipped', reason: 'delete-failed', schema: isLegacy ? 'legacy' : 'current' }
  }
}

export async function hasActivity(type, sourceId) {
  try {
    const activityId = activityIdFor(type, sourceId)
    const snapshot = await getDocs(query(collection(db, 'activities'), where(documentId(), '==', activityId), where('visibility', '==', 'public'), limit(1)))
    return snapshot.docs.some((item) => item.id === activityId && item.data().uid === getFirebaseAuth().currentUser?.uid)
  }
  catch (error) { throw activityError(error) }
}

export function subscribeToActivities(onChange, onError, max = 100) {
  const count = Math.min(100, Math.max(1, max))
  return onSnapshot(query(collection(db, 'activities'), where('visibility', '==', 'public'), orderBy('createdAt', 'desc'), limit(count)), (snapshot) => {
    onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
  }, (error) => onError?.(activityError(error, 'public-listener')))
}

export function subscribeToUserActivities(uid, onChange, onError, max = 100) {
  if (!uid) { onChange([]); return () => {} }
  const count = Math.min(100, Math.max(1, max))
  return onSnapshot(query(collection(db, 'activities'), where('uid', '==', uid), where('visibility', '==', 'public'), orderBy('createdAt', 'desc'), limit(count)), (snapshot) => {
    onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
  }, (error) => onError?.(activityError(error, 'user-listener')))
}

export async function enrichActivities(items) {
  return Promise.all(items.map(async (activity) => {
    const [mediaType, mediaId] = String(activity.mediaKey || '').split('_')
    const isListActivity = activity.type === 'list' || activity.targetType === 'list' || activity.sourceType === 'list'
    const listSourceId = activity.targetId || activity.sourceId
    const sourceRequest = activity.type === 'review'
      ? getDoc(doc(db, 'reviews', activity.targetId)).then((snapshot) => snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null)
      : isListActivity && listSourceId
        ? getDoc(doc(db, 'lists', listSourceId)).then((snapshot) => snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null)
        : activity.type === 'watched' && ['movie', 'tv'].includes(mediaType) && mediaId
          ? (mediaType === 'tv' ? getTVDetails(mediaId) : getMovieDetails(mediaId)).then((media) => ({ title: media.title || media.name || '', posterPath: media.poster_path || '', mediaType, mediaId }))
          : Promise.resolve(null)
    const [profileResult, sourceResult] = await Promise.allSettled([getCachedReviewProfile(activity.uid), sourceRequest])
    return { ...activity, isListActivity, actorProfile: profileResult.status === 'fulfilled' ? profileResult.value : null, source: sourceResult.status === 'fulfilled' ? sourceResult.value : null }
  }))
}

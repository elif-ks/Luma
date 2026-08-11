import { collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, query, runTransaction, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'

export const PRIVATE_LIBRARY_DEFAULTS = { showFavorites: false, showWatched: false }

function privacyError(error) {
  const code = String(error?.code || '').replace(/^firestore\//, '')
  const messages = {
    'permission-denied': 'Bu profil görünürlüğü işlemini yapmaya yetkiniz yok.',
    unauthenticated: 'Profil görünürlüğünü değiştirmek için giriş yapmalısınız.',
    unavailable: 'Profil görünürlüğü servisine şu anda ulaşılamıyor.',
    'deadline-exceeded': 'Profil görünürlüğü işlemi zaman aşımına uğradı.'
  }
  const mapped = new Error(messages[code] || 'Profil görünürlüğü güncellenemedi.')
  mapped.code = error?.code || 'library-privacy/unknown'
  return mapped
}

const settingsRef = (uid) => doc(db, 'users', uid, 'publicSettings', 'library')
const publicCollection = (uid, kind) => collection(db, 'users', uid, kind === 'favorite' ? 'publicFavorites' : 'publicWatched')

export async function getLibraryPrivacy(uid) {
  if (!uid) return { ...PRIVATE_LIBRARY_DEFAULTS }
  try {
    const snapshot = await getDoc(settingsRef(uid))
    return snapshot.exists() ? { ...PRIVATE_LIBRARY_DEFAULTS, ...snapshot.data() } : { ...PRIVATE_LIBRARY_DEFAULTS }
  } catch (error) { throw privacyError(error) }
}

export function subscribeToLibraryPrivacy(uid, onChange, onError) {
  if (!uid) { onChange({ ...PRIVATE_LIBRARY_DEFAULTS }); return () => {} }
  return onSnapshot(settingsRef(uid), (snapshot) => onChange(snapshot.exists() ? { ...PRIVATE_LIBRARY_DEFAULTS, ...snapshot.data() } : { ...PRIVATE_LIBRARY_DEFAULTS }), (error) => onError?.(privacyError(error)))
}

const yearOf = (value) => /^\d{4}/.test(String(value || '')) ? String(value).slice(0, 4) : ''
const safeMedia = (uid, item, createdAt = serverTimestamp()) => ({
  uid,
  mediaKey: `${item.mediaType}_${String(item.mediaId)}`,
  mediaType: item.mediaType,
  mediaId: String(item.mediaId),
  title: String(item.title || ''),
  posterPath: String(item.posterPath || ''),
  year: yearOf(item.releaseDate),
  createdAt,
  updatedAt: serverTimestamp()
})

async function commitInChunks(operations) {
  for (let offset = 0; offset < operations.length; offset += 450) {
    const batch = writeBatch(db)
    operations.slice(offset, offset + 450).forEach((operation) => operation(batch))
    await batch.commit()
  }
}

async function syncAll(uid, kind) {
  const [librarySnapshot, publicSnapshot] = await Promise.all([
    getDocs(collection(db, 'users', uid, 'library')),
    getDocs(publicCollection(uid, kind))
  ])
  const existing = new Map(publicSnapshot.docs.map((item) => [item.id, item.data()]))
  const desired = librarySnapshot.docs.filter((item) => item.data()[kind] === true)
  const desiredIds = new Set(desired.map((item) => item.id))
  const operations = desired.map((item) => (batch) => batch.set(doc(publicCollection(uid, kind), item.id), safeMedia(uid, item.data(), existing.get(item.id)?.createdAt || serverTimestamp())))
  publicSnapshot.docs.filter((item) => !desiredIds.has(item.id)).forEach((item) => operations.push((batch) => batch.delete(item.ref)))
  await commitInChunks(operations)
}

async function clearPublic(uid, kind) {
  const snapshot = await getDocs(publicCollection(uid, kind))
  await commitInChunks(snapshot.docs.map((item) => (batch) => batch.delete(item.ref)))
}

async function writeVisibility(uid, field, visible) {
  await runTransaction(db, async (transaction) => {
    const reference = settingsRef(uid)
    const snapshot = await transaction.get(reference)
    const current = snapshot.exists() ? { ...PRIVATE_LIBRARY_DEFAULTS, ...snapshot.data() } : PRIVATE_LIBRARY_DEFAULTS
    transaction.set(reference, { uid, showFavorites: field === 'showFavorites' ? visible : Boolean(current.showFavorites), showWatched: field === 'showWatched' ? visible : Boolean(current.showWatched), updatedAt: serverTimestamp() })
  })
}

export async function setLibraryVisibility(uid, kind, visible) {
  if (!uid || !['favorite', 'watched'].includes(kind)) throw new Error('Geçersiz profil görünürlüğü isteği.')
  const field = kind === 'favorite' ? 'showFavorites' : 'showWatched'
  try {
    if (visible) {
      await syncAll(uid, kind)
      await writeVisibility(uid, field, true)
      return
    }
    await writeVisibility(uid, field, false)
    try { await clearPublic(uid, kind) }
    catch (cleanupError) {
      const error = privacyError(cleanupError)
      error.message = 'Görünürlük kapatıldı ancak eski profil kayıtlarının temizliği tamamlanamadı. Veriler diğer kullanıcılara kapalıdır.'
      throw error
    }
  } catch (error) { if (String(error?.code || '').startsWith('library-privacy/')) throw error; throw privacyError(error) }
}

export const setFavoritesVisibility = (uid, visible) => setLibraryVisibility(uid, 'favorite', visible)
export const setWatchedVisibility = (uid, visible) => setLibraryVisibility(uid, 'watched', visible)

export async function syncLibraryItemIfPublic(uid, item) {
  const settings = await getLibraryPrivacy(uid)
  await Promise.all(['favorite', 'watched'].map(async (kind) => {
    const enabled = kind === 'favorite' ? settings.showFavorites : settings.showWatched
    if (!enabled) return
    const mediaKey = `${item?.mediaType}_${String(item?.mediaId)}`
    const reference = doc(publicCollection(uid, kind), mediaKey)
    if (!item || item[kind] !== true) { if ((await getDoc(reference)).exists()) await deleteDoc(reference); return }
    const snapshot = await getDoc(reference)
    await setDoc(reference, safeMedia(uid, item, snapshot.exists() ? snapshot.data().createdAt : serverTimestamp()))
  }))
}

function newest(items) {
  const millis = (value) => typeof value?.toMillis === 'function' ? value.toMillis() : (value?.seconds || 0) * 1000
  return items.sort((a, b) => millis(b.updatedAt) - millis(a.updatedAt))
}

export function subscribeToPublicLibrary(uid, kind, onChange, onError, count = 100) {
  if (!uid) { onChange([]); return () => {} }
  return onSnapshot(query(publicCollection(uid, kind), limit(Math.min(100, count))), (snapshot) => onChange(newest(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))), (error) => onError?.(privacyError(error)))
}

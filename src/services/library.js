import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './firebase'

const LIBRARY_STATES = ['favorite', 'watched', 'watchlist']

function libraryError(error) {
  const code = String(error?.code || '').replace(/^firestore\//, '')
  const messages = {
    'permission-denied': 'Bu kütüphane işlemini yapmaya yetkiniz yok.',
    unauthenticated: 'Bu işlem için giriş yapmalısınız.',
    unavailable: 'Kütüphane servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin.',
    aborted: 'Kütüphane aynı anda güncellendi. Lütfen tekrar deneyin.',
    'deadline-exceeded': 'Kütüphane işlemi zaman aşımına uğradı. Lütfen tekrar deneyin.'
  }

  const mappedError = new Error(messages[code] || 'Kütüphane işlemi tamamlanamadı. Lütfen tekrar deneyin.')
  mappedError.code = error?.code || 'library/unknown'
  return mappedError
}

function assertLibraryInput(uid, mediaType, mediaId) {
  if (!uid) throw new Error('Kütüphane işlemi için giriş yapmalısınız.')
  if (!['movie', 'tv'].includes(mediaType)) throw new Error('Geçersiz medya türü.')
  if (mediaId === undefined || mediaId === null || mediaId === '') throw new Error('Geçersiz medya kimliği.')
}

export function getLibraryDocumentId(mediaType, mediaId) {
  return `${mediaType}_${String(mediaId)}`
}

function emptyLibraryState() {
  return { favorite: false, watched: false, watchlist: false }
}

export async function getLibraryItem(uid, mediaType, mediaId) {
  assertLibraryInput(uid, mediaType, mediaId)

  try {
    const reference = doc(db, 'users', uid, 'library', getLibraryDocumentId(mediaType, mediaId))
    const snapshot = await getDoc(reference)
    return snapshot.exists() ? snapshot.data() : null
  } catch (error) {
    throw libraryError(error)
  }
}

export async function setLibraryStatus({ uid, media, status, value }) {
  const mediaType = media?.mediaType
  const mediaId = String(media?.mediaId ?? '')
  assertLibraryInput(uid, mediaType, mediaId)

  if (!LIBRARY_STATES.includes(status)) throw new Error('Geçersiz kütüphane durumu.')

  const reference = doc(db, 'users', uid, 'library', getLibraryDocumentId(mediaType, mediaId))

  try {
    const result = await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(reference)
      const previous = snapshot.exists() ? snapshot.data() : emptyLibraryState()
      const next = {
        favorite: Boolean(previous.favorite),
        watched: Boolean(previous.watched),
        watchlist: Boolean(previous.watchlist),
        [status]: Boolean(value)
      }

      if (status === 'watched' && value) next.watchlist = false

      if (!next.favorite && !next.watched && !next.watchlist) {
        if (snapshot.exists()) transaction.delete(reference)
        return null
      }

      const data = {
        uid,
        mediaId,
        mediaType,
        title: String(media.title || ''),
        posterPath: String(media.posterPath || ''),
        releaseDate: String(media.releaseDate || ''),
        favorite: next.favorite,
        watched: next.watched,
        watchlist: next.watchlist,
        favoriteAt: next.favorite
          ? (previous.favoriteAt || serverTimestamp())
          : null,
        watchedAt: next.watched
          ? (previous.watchedAt || serverTimestamp())
          : null,
        watchlistAt: next.watchlist
          ? (previous.watchlistAt || serverTimestamp())
          : null,
        createdAt: previous.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      transaction.set(reference, data)
      return data
    })
    try {
      const { syncLibraryItemIfPublic } = await import('./libraryPrivacy')
      await syncLibraryItemIfPublic(uid, result || { ...media, mediaId, mediaType, favorite: false, watched: false })
    } catch (privacySyncError) {
      console.warn('İşlem kaydedildi ancak profil görünürlüğü güncellenemedi.', privacySyncError)
    }
    return result
  } catch (error) {
    throw libraryError(error)
  }
}

export async function listUserLibrary(uid) {
  if (!uid) throw new Error('Kütüphaneyi görüntülemek için giriş yapmalısınız.')

  try {
    const snapshot = await getDocs(collection(db, 'users', uid, 'library'))
    return snapshot.docs.map((item) => item.data())
  } catch (error) {
    throw libraryError(error)
  }
}

export function subscribeToUserLibrary(uid, onLibraryChange, onLibraryError) {
  if (!uid) throw new Error('Kütüphaneyi dinlemek için giriş yapmalısınız.')

  const reference = collection(db, 'users', uid, 'library')

  return onSnapshot(
    reference,
    (snapshot) => {
      onLibraryChange(snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      })))
    },
    (error) => {
      onLibraryError?.(libraryError(error))
    }
  )
}

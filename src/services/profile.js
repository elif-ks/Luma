import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAt,
  endAt,
  updateDoc
} from 'firebase/firestore'
import { db, getFirebaseAuth } from './firebase'
import { validateUsername } from '../utils/username'
import { isAllowedAvatarPath } from '../data/avatars'

const USERNAME_TAKEN_CODE = 'profile/username-taken'

export function normalizeUsername(username) {
  return String(username || '').trim().toLocaleLowerCase('tr-TR')
}

export async function searchProfilesByUsername(value, count = 20) {
  const normalized = normalizeUsername(value)
  if (Array.from(normalized).length < 2) return []
  try {
    const snapshot = await getDocs(query(
      collection(db, 'users'),
      orderBy('usernameLower'),
      startAt(normalized),
      endAt(`${normalized}\uf8ff`),
      limit(Math.min(Math.max(count, 1), 20))
    ))
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
  } catch (error) {
    const message = error?.code === 'permission-denied'
      ? 'Kullanıcı araması için yetkiniz yok.'
      : 'Kullanıcılar aranamadı. Lütfen tekrar deneyin.'
    throw createProfileError(message, error?.code || 'profile/search-failed')
  }
}

function prepareUsername(username) {
  const trimmedUsername = String(username || '').trim()
  const validationError = validateUsername(trimmedUsername)

  if (validationError) {
    throw createProfileError(validationError, 'profile/invalid-username')
  }

  return {
    username: trimmedUsername,
    usernameLower: normalizeUsername(trimmedUsername)
  }
}

function createProfileError(message, code = 'profile/unknown') {
  const error = new Error(message)
  error.code = code
  return error
}

function usernameTakenError() {
  return createProfileError('Bu kullanıcı adı kullanılıyor.', USERNAME_TAKEN_CODE)
}

function toSafeFallbackUsername(value) {
  let username = String(value || '')
    .trim()
    .replace(/\s+/gu, '_')
    .replace(/[^\p{L}\p{N}_]/gu, '')

  if (!/^\p{L}/u.test(username)) username = `user_${username}`
  if (Array.from(username).length < 3) username = `${username}_luma`

  return Array.from(username).slice(0, 20).join('')
}

function stableUidSuffix(uid, attempt = 0) {
  const source = `${uid}:${attempt}`
  let hash = 2166136261

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(36).slice(0, 7)
}

function withStableUidSuffix(username, uid, attempt = 0) {
  const suffix = stableUidSuffix(uid, attempt)
  const maxBaseLength = 20 - suffix.length - 1
  const base = Array.from(username).slice(0, maxBaseLength).join('')
  return `${base}_${suffix}`
}

function mapFirestoreError(error) {
  if (error?.code?.startsWith('profile/')) return error

  const firestoreCode = String(error?.code || '').replace(/^firestore\//, '')

  const messages = {
    'permission-denied': 'Bu profil işlemini yapmaya yetkiniz yok.',
    unauthenticated: 'Bu işlem için giriş yapmalısınız.',
    unavailable: 'Profil servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin.',
    aborted: 'Profil aynı anda güncellendi. Lütfen tekrar deneyin.',
    'failed-precondition': 'Profil işlemi için gerekli koşullar sağlanamadı.',
    'deadline-exceeded': 'Profil işlemi zaman aşımına uğradı. Lütfen tekrar deneyin.',
    'not-found': 'Profil bulunamadı.'
  }

  return createProfileError(
    messages[firestoreCode] || 'Profil işlemi tamamlanamadı. Lütfen daha sonra tekrar deneyin.',
    error?.code || 'profile/unknown'
  )
}

export async function isUsernameAvailable(username) {
  const { usernameLower } = prepareUsername(username)

  try {
    const reservation = await getDoc(doc(db, 'usernames', usernameLower))
    return !reservation.exists()
  } catch (error) {
    throw mapFirestoreError(error)
  }
}

export async function createProfileWithUsername({ uid, username, bio = '', photoURL = '' }) {
  if (!uid) {
    throw createProfileError('Profil oluşturmak için geçerli bir kullanıcı kimliği gerekli.', 'profile/missing-uid')
  }

  const preparedUsername = prepareUsername(username)
  const userRef = doc(db, 'users', uid)
  const usernameRef = doc(db, 'usernames', preparedUsername.usernameLower)

  try {
    return await runTransaction(db, async (transaction) => {
      const userSnapshot = await transaction.get(userRef)
      const usernameSnapshot = await transaction.get(usernameRef)

      if (userSnapshot.exists()) {
        return userSnapshot.data()
      }

      if (usernameSnapshot.exists() && usernameSnapshot.data().uid !== uid) {
        throw usernameTakenError()
      }

      const profile = {
        uid,
        username: preparedUsername.username,
        usernameLower: preparedUsername.usernameLower,
        bio: String(bio || ''),
        photoURL: String(photoURL || ''),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      if (!usernameSnapshot.exists()) {
        transaction.set(usernameRef, {
          uid,
          createdAt: serverTimestamp()
        })
      }
      transaction.set(userRef, profile)

      return profile
    })
  } catch (error) {
    throw mapFirestoreError(error)
  }
}

export async function getProfileByUid(uid) {
  if (!uid) return null

  try {
    const snapshot = await getDoc(doc(db, 'users', uid))
    return snapshot.exists() ? snapshot.data() : null
  } catch (error) {
    throw mapFirestoreError(error)
  }
}

export async function getProfileByUsername(username) {
  const usernameLower = normalizeUsername(username)
  if (!usernameLower) return null
  try {
    const reservation = await getDoc(doc(db, 'usernames', usernameLower))
    if (!reservation.exists()) return null
    return getProfileByUid(reservation.data().uid)
  } catch (error) { throw mapFirestoreError(error) }
}

export async function ensureUserProfile({ username, bio = '', photoURL } = {}) {
  const firebaseUser = getFirebaseAuth().currentUser

  if (!firebaseUser) {
    throw createProfileError('Profil oluşturmak için giriş yapmalısınız.', 'profile/unauthenticated')
  }

  const existingProfile = await getProfileByUid(firebaseUser.uid)
  if (existingProfile) return existingProfile

  const fallbackUsername = toSafeFallbackUsername(
    username || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'luma_user'
  )
  const profileInput = {
    uid: firebaseUser.uid,
    bio,
    photoURL: photoURL ?? firebaseUser.photoURL ?? ''
  }

  try {
    return await createProfileWithUsername({ ...profileInput, username: fallbackUsername })
  } catch (error) {
    if (error?.code !== USERNAME_TAKEN_CODE) throw error
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await createProfileWithUsername({
        ...profileInput,
        username: withStableUidSuffix(fallbackUsername, firebaseUser.uid, attempt)
      })
    } catch (error) {
      if (error?.code !== USERNAME_TAKEN_CODE) throw error
    }
  }

  throw usernameTakenError()
}

export const ensureCurrentUserProfile = ensureUserProfile

export async function changeUsernameWithReservation(uid, newUsername) {
  if (!uid) {
    throw createProfileError('Kullanıcı adını değiştirmek için geçerli bir kullanıcı kimliği gerekli.', 'profile/missing-uid')
  }

  const preparedUsername = prepareUsername(newUsername)
  const userRef = doc(db, 'users', uid)
  const newUsernameRef = doc(db, 'usernames', preparedUsername.usernameLower)

  try {
    return await runTransaction(db, async (transaction) => {
      const userSnapshot = await transaction.get(userRef)

      if (!userSnapshot.exists()) {
        throw createProfileError('Profil bulunamadı.', 'profile/not-found')
      }

      const currentProfile = userSnapshot.data()
      const oldUsernameLower = normalizeUsername(currentProfile.usernameLower || currentProfile.username)
      const oldUsernameRef = doc(db, 'usernames', oldUsernameLower)
      const newUsernameSnapshot = await transaction.get(newUsernameRef)
      const oldUsernameSnapshot = oldUsernameLower === preparedUsername.usernameLower
        ? newUsernameSnapshot
        : await transaction.get(oldUsernameRef)

      if (newUsernameSnapshot.exists() && newUsernameSnapshot.data().uid !== uid) {
        throw usernameTakenError()
      }

      if (!newUsernameSnapshot.exists()) {
        transaction.set(newUsernameRef, {
          uid,
          createdAt: serverTimestamp()
        })
      }
      transaction.update(userRef, {
        username: preparedUsername.username,
        usernameLower: preparedUsername.usernameLower,
        updatedAt: serverTimestamp()
      })

      if (
        oldUsernameLower !== preparedUsername.usernameLower &&
        oldUsernameSnapshot.exists() &&
        oldUsernameSnapshot.data().uid === uid
      ) {
        transaction.delete(oldUsernameRef)
      }

      return {
        ...currentProfile,
        username: preparedUsername.username,
        usernameLower: preparedUsername.usernameLower
      }
    })
  } catch (error) {
    throw mapFirestoreError(error)
  }
}

export const changeUsername = changeUsernameWithReservation

export async function updateProfilePhoto(uid, photoURL) {
  if (!uid) throw createProfileError('Avatarı değiştirmek için giriş yapmalısınız.', 'profile/unauthenticated')
  if (!isAllowedAvatarPath(photoURL)) throw createProfileError('Geçersiz avatar seçimi.', 'profile/invalid-avatar')
  try {
    await updateDoc(doc(db, 'users', uid), { photoURL, updatedAt: serverTimestamp() })
    return photoURL
  } catch (error) { throw mapFirestoreError(error) }
}

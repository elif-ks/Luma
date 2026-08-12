import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import { getFirestore } from 'firebase/firestore'
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

const missingFirebaseConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !String(value || '').trim())
  .map(([key]) => key)

const appCheckSiteKey = String(import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY || '').trim()

let appInstance = null
let appCheckInstance = null
let authInstance = null
let currentUser = null
let authInitialized = false
let authReady = false
const authListeners = []

function normalizeUser(user) {
  if (!user) return null
  return {
    uid: user.uid || user.email,
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0] || 'Luma Kullanıcısı',
    emailVerified: Boolean(user.emailVerified),
    photoURL: user.photoURL || ''
  }
}

function notifyListeners(user) {
  const normalizedUser = normalizeUser(user)
  currentUser = normalizedUser
  authListeners.forEach((listener) => listener(normalizedUser))
}

export function getFirebaseApp() {
  if (!appInstance) {
    if (missingFirebaseConfig.length) {
      throw new Error(`Firebase yapılandırması eksik: ${missingFirebaseConfig.join(', ')}`)
    }
    appInstance = initializeApp(firebaseConfig)

    if (import.meta.env.PROD === true && appCheckSiteKey) {
      try {
        appCheckInstance = initializeAppCheck(appInstance, {
          provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
          isTokenAutoRefreshEnabled: true,
        })
      } catch {
        console.warn('Firebase App Check başlatılamadı; uygulama korumasız olarak açılıyor.')
      }
    }
  }
  return appInstance
}

export function getFirebaseAuth() {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp())
  }
  return authInstance
}

export function onAuthStateChangedListener(callback) {
  authListeners.push(callback)
  if (authReady) {
    callback(currentUser)
  }
  return () => {
    const index = authListeners.indexOf(callback)
    if (index >= 0) {
      authListeners.splice(index, 1)
    }
  }
}

export function initializeFirebaseAuth() {
  if (!authInitialized) {
    authInitialized = true
    const auth = getFirebaseAuth()
    onAuthStateChanged(auth, (user) => {
      authReady = true
      notifyListeners(user)
    })
  }
}

export const db = getFirestore(getFirebaseApp())

function mapFirebaseError(error) {
  const code = error?.code || ''
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Bu e-posta adresi zaten kullanımda.'
    case 'auth/invalid-email':
      return 'Geçersiz e-posta adresi.'
    case 'auth/weak-password':
      return 'Şifre en az 6 karakter olmalı.'
    case 'auth/operation-not-allowed':
      return 'E-posta ve şifre ile giriş şu anda kullanılamıyor.'
    case 'auth/user-not-found':
      return 'Bu e-posta ile kullanıcı bulunamadı.'
    case 'auth/wrong-password':
      return 'Şifre yanlış.'
    case 'auth/invalid-credential':
      return 'E-posta adresi veya şifre hatalı.'
    case 'auth/user-disabled':
      return 'Bu kullanıcı hesabı devre dışı bırakılmış.'
    case 'auth/network-request-failed':
      return 'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.'
    case 'auth/invalid-api-key':
      return 'Firebase yapılandırması eksik veya geçersiz.'
    case 'auth/too-many-requests':
      return 'Çok fazla istek gönderildi. Biraz bekleyip tekrar deneyin.'
    default:
      return 'Bir şeyler ters gitti. Lütfen tekrar deneyin.'
  }
}

function createAuthError(error) {
  const authError = new Error(mapFirebaseError(error))
  authError.code = error?.code || 'auth/unknown'
  return authError
}

export async function registerWithEmail(email, password) {
  try {
    const auth = getFirebaseAuth()
    const result = await createUserWithEmailAndPassword(auth, email, password)
    return {
      firebaseUser: result.user,
      user: normalizeUser(result.user)
    }
  } catch (error) {
    throw createAuthError(error)
  }
}

export async function updateFirebaseUserDisplayName(firebaseUser, username) {
  if (!firebaseUser) {
    throw new Error('Kullanıcı adı güncellenebilmesi için oturum açmalısınız.')
  }

  try {
    await updateProfile(firebaseUser, { displayName: username })
    await reload(firebaseUser)
    notifyListeners(firebaseUser)
    return normalizeUser(firebaseUser)
  } catch (error) {
    throw createAuthError(error)
  }
}

export async function updateFirebaseUserPhoto(firebaseUser, photoURL) {
  if (!firebaseUser) throw new Error('Avatarı güncellemek için geçerli bir Firebase kullanıcısı gerekli.')
  await updateProfile(firebaseUser, { photoURL })
  await reload(firebaseUser)
  return firebaseUser
}

export async function deleteFirebaseUser(firebaseUser) {
  if (!firebaseUser) return false

  try {
    await deleteUser(firebaseUser)
    return true
  } catch (error) {
    throw createAuthError(error)
  }
}

export async function loginWithEmail(email, password) {
  try {
    const auth = getFirebaseAuth()
    const result = await signInWithEmailAndPassword(auth, email, password)
    return {
      firebaseUser: result.user,
      user: normalizeUser(result.user)
    }
  } catch (error) {
    throw createAuthError(error)
  }
}

export async function refreshFirebaseUser(user) {
  try {
    if (!user) {
      throw new Error('Yenilenecek kullanıcı bilgisi bulunamadı.')
    }
    await reload(user)
    return normalizeUser(user)
  } catch (error) {
    if (!error?.code) throw error
    throw createAuthError(error)
  }
}

export async function updateFirebaseUsername(username) {
  const auth = getFirebaseAuth()
  const firebaseUser = auth.currentUser

  if (!firebaseUser) {
    throw new Error('Kullanıcı adı güncellenebilmesi için oturum açmalısınız.')
  }

  return updateFirebaseUserDisplayName(firebaseUser, username)
}

export async function logout() {
  try {
    const auth = getFirebaseAuth()
    await signOut(auth)
    return true
  } catch (error) {
    throw createAuthError(error)
  }
}

export async function resetPassword(email) {
  try {
    const auth = getFirebaseAuth()
    await sendPasswordResetEmail(auth, email)
    return true
  } catch (error) {
    throw createAuthError(error)
  }
}

export async function verifyEmail(user) {
  try {
    if (!user) {
      throw new Error('Doğrulama e-postası gönderilecek kullanıcı bulunamadı.')
    }
    await sendEmailVerification(user)
    return true
  } catch (error) {
    if (!error?.code) throw error
    throw createAuthError(error)
  }
}

export function getCurrentUser() {
  return currentUser
}

initializeFirebaseAuth()

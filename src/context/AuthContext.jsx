import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  deleteFirebaseUser,
  getCurrentUser,
  loginWithEmail,
  logout,
  onAuthStateChangedListener,
  refreshFirebaseUser,
  registerWithEmail,
  resetPassword,
  updateFirebaseUsername,
  updateFirebaseUserPhoto,
  updateFirebaseUserDisplayName,
  verifyEmail
} from '../services/firebase'
import {
  changeUsername as changeFirestoreUsername,
  createProfileWithUsername,
  ensureUserProfile,
  getProfileByUid,
  isUsernameAvailable
} from '../services/profile'
import { updateProfilePhoto } from '../services/profile'
import { setCachedPostProfile } from '../services/posts'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getCurrentUser())
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const profileSyncPaused = useRef(false)
  const profileRequestId = useRef(0)

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener((nextUser) => {
      setUser(nextUser)
      setAuthLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const loadProfileForUser = async (uid) => {
    if (!uid) return null

    const requestId = profileRequestId.current + 1
    profileRequestId.current = requestId
    setProfileLoading(true)
    setProfileError('')

    try {
      const existingProfile = await getProfileByUid(uid)
      const nextProfile = existingProfile || await ensureUserProfile()

      if (profileRequestId.current === requestId) setProfile(nextProfile)
      return nextProfile
    } catch (profileLoadError) {
      if (profileRequestId.current === requestId) {
        setProfile(null)
        setProfileError(profileLoadError.message || 'Profil bilgileri yüklenemedi. Lütfen tekrar deneyin.')
      }
      return null
    } finally {
      if (profileRequestId.current === requestId) setProfileLoading(false)
    }
  }

  useEffect(() => {
    if (!user?.uid) {
      profileRequestId.current += 1
      setProfile(null)
      setProfileLoading(false)
      setProfileError('')
      return
    }

    if (!profileSyncPaused.current) void loadProfileForUser(user.uid)
  }, [user?.uid])

  const signUp = async (username, email, password) => {
    setLoading(true)
    setError('')
    profileSyncPaused.current = true

    try {
      const usernameAvailable = await isUsernameAvailable(username)
      if (!usernameAvailable) throw new Error('Bu kullanıcı adı kullanılıyor.')

      const result = await registerWithEmail(email, password)
      let createdProfile

      try {
        createdProfile = await createProfileWithUsername({
          uid: result.firebaseUser.uid,
          username,
          photoURL: result.firebaseUser.photoURL || ''
        })
        setProfile(createdProfile)
      } catch (profileCreationError) {
        let rollbackError = ''

        try {
          await deleteFirebaseUser(result.firebaseUser)
        } catch (rollbackFailure) {
          rollbackError = rollbackFailure.message
          try {
            await logout()
          } catch {
            // İlk profil hatası ve rollback sonucu aşağıda kontrollü biçimde raporlanır.
          }
        }

        setUser(null)
        setProfile(null)

        if (rollbackError) {
          throw new Error(`Profil oluşturulamadı ve Auth hesabı geri alınamadı. ${rollbackError}`)
        }
        throw profileCreationError
      }

      let displayNameError = ''
      let verificationError = ''
      let signOutError = ''

      try {
        await updateFirebaseUserDisplayName(result.firebaseUser, username)
      } catch (displayNameFailure) {
        displayNameError = displayNameFailure.message
      }

      try {
        await verifyEmail(result.firebaseUser)
      } catch (verificationFailure) {
        verificationError = verificationFailure.message
      }

      try {
        await logout()
        setUser(null)
        setProfile(null)
      } catch (logoutFailure) {
        signOutError = logoutFailure.message
      }

      return {
        accountCreated: true,
        profileCreated: Boolean(createdProfile),
        displayNameUpdated: !displayNameError,
        displayNameError,
        verificationSent: !verificationError,
        signedOut: !signOutError,
        verificationError,
        signOutError
      }
    } catch (signUpError) {
      setError(signUpError.message)
      throw signUpError
    } finally {
      profileSyncPaused.current = false
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    setLoading(true)
    setError('')
    profileSyncPaused.current = true

    try {
      const result = await loginWithEmail(email, password)
      const refreshedUser = await refreshFirebaseUser(result.firebaseUser)

      if (!result.firebaseUser.emailVerified) {
        let verificationError = null

        try {
          await verifyEmail(result.firebaseUser)
        } catch (verificationFailure) {
          verificationError = verificationFailure
        }

        try {
          await logout()
        } finally {
          setUser(null)
          setProfile(null)
        }

        if (verificationError) throw verificationError
        throw new Error('E-posta adresin henüz doğrulanmamış. Yeni bir doğrulama bağlantısı gönderdik.')
      }

      setUser(refreshedUser)
      void loadProfileForUser(refreshedUser.uid)
      return refreshedUser
    } catch (signInError) {
      setError(signInError.message)
      throw signInError
    } finally {
      profileSyncPaused.current = false
      setLoading(false)
    }
  }

  const signOutUser = async () => {
    setLoading(true)
    setError('')

    try {
      await logout()
      profileRequestId.current += 1
      setUser(null)
      setProfile(null)
      setProfileLoading(false)
      setProfileError('')
    } catch (signOutError) {
      setError(signOutError.message)
      throw signOutError
    } finally {
      setLoading(false)
    }
  }

  const sendResetEmail = async (email) => {
    setLoading(true)
    setError('')

    try {
      await resetPassword(email)
      return true
    } catch (resetError) {
      setError(resetError.message)
      throw resetError
    } finally {
      setLoading(false)
    }
  }

  const changeUsername = async (username) => {
    setLoading(true)
    setError('')
    setProfileError('')

    try {
      if (!user?.uid) throw new Error('Kullanıcı adını değiştirmek için giriş yapmalısınız.')

      const updatedProfile = await changeFirestoreUsername(user.uid, username)
      setProfile(updatedProfile)

      let updatedUser
      try {
        updatedUser = await updateFirebaseUsername(username)
      } catch (authProfileError) {
        throw new Error(`Kullanıcı adın kaydedildi ancak Auth profili güncellenemedi. ${authProfileError.message}`)
      }

      setUser(updatedUser)
      const refreshedProfile = await getProfileByUid(user.uid)
      if (refreshedProfile) { setProfile(refreshedProfile); setCachedPostProfile(user.uid, refreshedProfile) }
      return refreshedProfile || updatedProfile
    } catch (usernameError) {
      setError(usernameError.message)
      throw usernameError
    } finally {
      setLoading(false)
    }
  }

  const changeAvatar = async (photoURL) => {
    if (!user?.uid) throw new Error('Avatarı değiştirmek için giriş yapmalısınız.')
    setLoading(true); setError(''); setProfileError('')
    try {
      await updateProfilePhoto(user.uid, photoURL)
      setProfile((current) => ({ ...current, photoURL }))
      let warning = ''
      try {
        const firebaseUser = getCurrentUser()
        if (firebaseUser) {
          const refreshed = await updateFirebaseUserPhoto(firebaseUser, photoURL)
          setUser((current) => ({ ...current, photoURL: refreshed.photoURL || '' }))
        }
      } catch (authError) {
        warning = `Avatarın kaydedildi ancak Auth profili senkronize edilemedi. ${authError.message}`
      }
      const refreshedProfile = await getProfileByUid(user.uid)
      if (refreshedProfile) { setProfile(refreshedProfile); setCachedPostProfile(user.uid, refreshedProfile) }
      return { profile: refreshedProfile || { ...profile, photoURL }, warning }
    } catch (avatarError) { setError(avatarError.message); throw avatarError } finally { setLoading(false) }
  }

  const value = useMemo(() => ({
    user,
    profile,
    profileLoading,
    profileError,
    loading: loading || authLoading,
    authLoading,
    error,
    signUp,
    signIn,
    signOut: signOutUser,
    resetPassword: sendResetEmail,
    updateUsername: changeUsername,
    updateAvatar: changeAvatar,
    refreshProfile: () => loadProfileForUser(user?.uid)
  }), [user, profile, profileLoading, profileError, loading, authLoading, error])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

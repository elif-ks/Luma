import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { subscribeToUserDiary } from '../services/diary'
import { subscribeToUserLibrary } from '../services/library'
import { clearRecommendationCache, getPersonalizedRecommendations } from '../services/recommendations'
import { subscribeToUserReviews } from '../services/reviews'

export function useRecommendations(limit = 20) {
  const { user, authLoading } = useAuth()
  const [signals, setSignals] = useState({ library: null, reviews: null, diary: null })
  const [state, setState] = useState({ items: [], genres: [], loading: false, error: '', sufficient: false, requestCount: 0 })
  const [retryKey, setRetryKey] = useState(0)
  const requestId = useRef(0)
  const previousUid = useRef(null)

  useEffect(() => {
    const oldUid = previousUid.current
    if (oldUid && oldUid !== user?.uid) clearRecommendationCache(oldUid)
    previousUid.current = user?.uid || null
    setSignals({ library: null, reviews: null, diary: null })
    if (!user?.uid) { setState({ items: [], genres: [], loading: false, error: '', sufficient: false, requestCount: 0 }); return undefined }
    setState((current) => ({ ...current, loading: true, error: '' }))
    const update = (key) => (items) => setSignals((current) => ({ ...current, [key]: items }))
    const fail = (error) => setState((current) => ({ ...current, loading: false, error: error.message || 'Öneri verileri yüklenemedi.' }))
    const stops = [
      subscribeToUserLibrary(user.uid, update('library'), fail),
      subscribeToUserReviews(user.uid, update('reviews'), fail),
      subscribeToUserDiary(user.uid, update('diary'), fail)
    ]
    return () => stops.forEach((stop) => stop?.())
  }, [user?.uid, retryKey])

  useEffect(() => {
    if (!user?.uid || Object.values(signals).some((value) => value === null)) return undefined
    let active = true
    const currentRequest = ++requestId.current
    setState((current) => ({ ...current, loading: true, error: '' }))
    getPersonalizedRecommendations({ uid: user.uid, ...signals, limit }).then((result) => {
      if (active && currentRequest === requestId.current) setState({ ...result, loading: false, error: '' })
    }).catch((error) => {
      if (active && currentRequest === requestId.current) setState((current) => ({ ...current, loading: false, error: error.message || 'Öneriler hazırlanamadı.' }))
    })
    return () => { active = false }
  }, [user?.uid, signals.library, signals.reviews, signals.diary, limit, retryKey])

  return { ...state, guest: !authLoading && !user, authLoading, retry: () => setRetryKey((value) => value + 1) }
}

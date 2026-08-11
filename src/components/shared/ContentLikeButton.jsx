import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { setContentLike, subscribeToContentLikes } from '../../services/contentLikes'

export function ContentLikeButton({ type, contentId, enabled = true, className = '' }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [state, setState] = useState({ count: 0, liked: false })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled || !contentId) return undefined
    setError('')
    return subscribeToContentLikes(type, contentId, user?.uid, setState, (loadError) => setError(loadError.message))
  }, [contentId, enabled, type, user?.uid])

  if (!enabled) return null

  const toggle = async (event) => {
    event.preventDefault(); event.stopPropagation()
    if (!user) { navigate('/login', { state: { from: `${location.pathname}${location.search}` } }); return }
    setPending(true); setError('')
    try { const result = await setContentLike(type, contentId, user.uid, !state.liked); if (result?.warning) setError(result.warning) }
    catch (actionError) { setError(actionError.message || 'Beğeni işlemi tamamlanamadı.') }
    finally { setPending(false) }
  }

  const label = state.liked ? 'Beğeniyi kaldır' : 'Beğen'
  return <span className={`content-like-wrap ${className}`.trim()}>
    <button type="button" className={`content-like-button${state.liked ? ' active' : ''}`} aria-pressed={state.liked} aria-label={`${label}, ${state.count} beğeni`} disabled={pending} onClick={toggle}><span aria-hidden="true">{state.liked ? '♥' : '♡'}</span><span>{pending ? '…' : state.count}</span></button>
    {error ? <small className="content-like-error" role="status">{error}</small> : null}
  </span>
}

import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Modal, PrimaryButton, SecondaryButton } from '../../design-system'
import { useAuth } from '../../context/AuthContext'
import { useSafety } from '../../context/SafetyContext'
import { ReportModal } from '../reports/ReportModal'

export function SafetyMenu({ targetUid, targetType = 'user', targetId, compact = false, reportable = true }) {
  const { user } = useAuth()
  const safety = useSafety()
  const navigate = useNavigate()
  const location = useLocation()
  const wrapRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [confirmBlock, setConfirmBlock] = useState(false)
  const [report, setReport] = useState(false)
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')
  const menuId = `safety-menu-${targetType}-${targetId || targetUid}`

  useEffect(() => {
    const closeOtherMenu = (event) => {
      if (event.detail !== menuId) setOpen(false)
    }
    window.addEventListener('luma:post-actions-open', closeOtherMenu)
    return () => window.removeEventListener('luma:post-actions-open', closeOtherMenu)
  }, [menuId])

  useEffect(() => {
    if (!open) return undefined
    const closeOutside = (event) => { if (!wrapRef.current?.contains(event.target)) setOpen(false) }
    const closeEscape = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeEscape)
    return () => { document.removeEventListener('mousedown', closeOutside); document.removeEventListener('keydown', closeEscape) }
  }, [open])

  if (user?.uid === targetUid) return null
  const login = () => navigate('/login', { state: { from: `${location.pathname}${location.search}` } })
  const act = async (type) => {
    if (!user) { login(); return }
    setPending(type); setError('')
    try {
      if (type === 'mute') await (safety.isMuted(targetUid) ? safety.unmute(targetUid) : safety.mute(targetUid))
      if (type === 'unblock') await safety.unblock(targetUid)
    } catch (actionError) { setError(actionError.message) }
    finally { setPending(''); setOpen(false) }
  }
  const block = async () => {
    setPending('block'); setError('')
    try { await safety.block(targetUid); setConfirmBlock(false); setOpen(false) }
    catch (blockError) { setError(blockError.message) }
    finally { setPending('') }
  }

  return <span ref={wrapRef} className={`safety-menu-wrap${compact ? ' compact' : ''}`} onClick={(event) => event.stopPropagation()}><button type="button" className="safety-menu-trigger" aria-label={targetType === 'post' ? 'Gönderi işlemleri' : 'Güvenlik seçenekleri'} aria-expanded={open} aria-haspopup="menu" aria-controls={menuId} disabled={Boolean(pending)} onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen((value) => !value) }}>•••</button>{open ? <span id={menuId} className="safety-menu-popover" role="menu">{safety.isBlocked(targetUid) ? <button type="button" role="menuitem" disabled={Boolean(pending)} onClick={() => act('unblock')}>Engeli kaldır</button> : <><button type="button" role="menuitem" disabled={Boolean(pending)} onClick={() => act('mute')}>{safety.isMuted(targetUid) ? 'Sesi aç' : 'Sessize al'}</button><button type="button" role="menuitem" disabled={Boolean(pending)} onClick={() => setConfirmBlock(true)}>Engelle</button></>}{reportable ? <button type="button" role="menuitem" disabled={Boolean(pending)} onClick={() => { if (!user) { login(); return } setReport(true); setOpen(false) }}>{targetType === 'post' ? 'Gönderiyi şikâyet et' : 'Şikâyet et'}</button> : null}</span> : null}{error ? <small className="content-like-error">{error}</small> : null}{confirmBlock ? <Modal title="Kullanıcıyı engelle" onClose={() => setConfirmBlock(false)} footer={<><SecondaryButton onClick={() => setConfirmBlock(false)} disabled={pending === 'block'}>Vazgeç</SecondaryButton><PrimaryButton onClick={block} disabled={pending === 'block'}>{pending === 'block' ? 'Engelleniyor…' : 'Kullanıcıyı engelle'}</PrimaryButton></>}><p>Bu kullanıcı engellendiğinde birbirinizi takip edemez, etkileşim kuramaz ve mesaj gönderemezsiniz. Mevcut takip ilişkileri kaldırılır.</p></Modal> : null}{report ? <ReportModal targetType={targetType} targetId={targetId || targetUid} onClose={() => setReport(false)}/> : null}</span>
}

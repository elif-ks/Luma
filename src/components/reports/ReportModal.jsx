import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Modal, PrimaryButton, SecondaryButton } from '../../design-system'
import { createReport } from '../../services/reports'

const TARGET_LABELS = { user: 'Kullanıcı', post: 'Gönderi', review: 'İnceleme', list: 'Liste', community: 'Topluluk', community_post: 'Topluluk gönderisi' }
const REASONS = [
  ['spam', 'Spam veya yanıltıcı içerik'],
  ['harassment', 'Taciz veya zorbalık'],
  ['hate', 'Nefret söylemi'],
  ['sexual', 'Uygunsuz cinsel içerik'],
  ['violence', 'Şiddet içerikleri'],
  ['misinformation', 'Yanlış veya yanıltıcı bilgi'],
  ['privacy', 'Gizlilik ihlali'],
  ['spoiler', 'Etiketsiz spoiler'],
  ['other', 'Diğer'],
]

export function ReportModal({ targetType, targetId, parentId = '', onClose }) {
  const { user } = useAuth()
  const formId = useId()
  const closeTimerRef = useRef(null)
  const [reason, setReason] = useState('spam')
  const [details, setDetails] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const resetForm = useCallback(() => {
    setReason('spam'); setDetails(''); setMessage(''); setSuccess(false)
  }, [])

  const closeModal = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    resetForm()
    onClose()
  }, [onClose, resetForm])

  useEffect(() => () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current)
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    if (saving || success) return
    setSaving(true); setMessage('')
    try {
      const result = await createReport({ reporterUid: user?.uid, targetType, targetId, parentId, reason, details })
      if (result.status === 'created') {
        setSuccess(true)
        setMessage('Şikâyetin alındı.')
        closeTimerRef.current = window.setTimeout(closeModal, 700)
      } else if (result.status === 'duplicate') {
        setSuccess(false)
        setMessage('Bu içeriği daha önce şikâyet ettin.')
      } else {
        throw new Error('Şikâyet sonucu doğrulanamadı. Lütfen tekrar dene.')
      }
    } catch (error) {
      setSuccess(false)
      setMessage(error.message)
    } finally { setSaving(false) }
  }

  return <Modal title="Şikâyet et" onClose={saving ? undefined : closeModal} footer={<><SecondaryButton onClick={closeModal} disabled={saving}>{success ? 'Kapat' : 'Vazgeç'}</SecondaryButton><PrimaryButton type="submit" form={formId} disabled={saving || success}>{saving ? 'Gönderiliyor…' : 'Şikâyeti gönder'}</PrimaryButton></>}><form id={formId} className="report-form" onSubmit={submit}><p><strong>{TARGET_LABELS[targetType] || 'İçerik'}</strong> için şikâyet oluşturuyorsun.</p><label><span>Neden</span><select value={reason} onChange={(event) => { setReason(event.target.value); setMessage('') }}>{REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Açıklama {reason === 'other' ? '(zorunlu)' : '(isteğe bağlı)'}</span><textarea value={details} onChange={(event) => { setDetails(event.target.value); setMessage('') }} maxLength={500} required={reason === 'other'} aria-describedby={`${formId}-counter`} /></label><small id={`${formId}-counter`} className="report-character-count">{details.length}/500</small><p className="report-notice">Şikâyetin incelenmek üzere kaydedilecek. Bu işlem içeriği otomatik olarak kaldırmaz.</p>{message ? <p role="status" className={`auth-message ${success ? 'auth-message-success' : 'auth-message-error'}`}>{message}</p> : null}</form></Modal>
}

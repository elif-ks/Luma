import { useCallback, useState } from 'react'
import { LUMA_AVATARS } from '../../data/avatars'
import { Modal, PrimaryButton, SecondaryButton } from '../../design-system'

export function AvatarPickerModal({ currentPhotoURL, onClose, onSave }) {
  const [selected, setSelected] = useState(currentPhotoURL || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const close = useCallback(() => { if (!saving) onClose() }, [onClose, saving])
  const save = async () => { setSaving(true); setError(''); try { await onSave(selected); onClose() } catch (e) { setError(e.message || 'Avatar kaydedilemedi.') } finally { setSaving(false) } }
  const preview = LUMA_AVATARS.find((avatar) => avatar.path === selected)
  return <Modal title="Avatarını seç" onClose={close} footer={<><SecondaryButton type="button" onClick={close} disabled={saving}>İptal</SecondaryButton><PrimaryButton type="button" onClick={save} disabled={saving || selected === currentPhotoURL}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</PrimaryButton></>}>
    <div className="avatar-picker-preview">{preview ? <img src={preview.path} alt={`${preview.name} önizlemesi`} /> : <span aria-hidden="true">A</span>}<div><strong>{preview?.name || 'Baş harf avatarı'}</strong><small>Profilinde böyle görünecek</small></div></div>
    {error ? <p className="auth-message auth-message-error">{error}</p> : null}
    <div className="avatar-picker-grid" role="radiogroup" aria-label="Hazır Luma avatarları">{LUMA_AVATARS.map((avatar) => <button type="button" role="radio" aria-checked={selected === avatar.path} aria-label={avatar.name} key={avatar.id} className={selected === avatar.path ? 'selected' : ''} onClick={() => setSelected(avatar.path)} disabled={saving}><img src={avatar.path} alt="" />{selected === avatar.path ? <span>✓ Seçili</span> : null}</button>)}</div>
    <button type="button" className={`avatar-remove-option${selected === '' ? ' selected' : ''}`} role="radio" aria-checked={selected === ''} onClick={() => setSelected('')} disabled={saving}>Avatarı kaldır · Baş harfe dön{selected === '' ? ' ✓' : ''}</button>
  </Modal>
}

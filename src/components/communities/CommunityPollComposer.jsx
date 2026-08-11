import { useState } from 'react'
import { createCommunityPoll } from '../../services/communities'
import { PrimaryButton, SecondaryButton } from '../../design-system'

export function CommunityPollComposer({ communityId, onCancel }) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [durationDays, setDurationDays] = useState('1')
  const [spoiler, setSpoiler] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event) => { event.preventDefault(); if (saving) return; setSaving(true); setError(''); try { await createCommunityPoll(communityId, { question, options, durationDays, spoiler }); setQuestion(''); setOptions(['', '']); setSpoiler(false); onCancel() } catch (e) { setError(e.message) } finally { setSaving(false) } }
  return <form className="community-poll-composer" onSubmit={submit}><label>Anket sorusu<input value={question} onChange={(e) => setQuestion(e.target.value)} minLength={3} maxLength={160} required/><small>{question.length}/160</small></label><fieldset><legend>Seçenekler</legend>{options.map((option, index) => <label key={index}>Seçenek {index + 1}<span><input value={option} onChange={(e) => setOptions((items) => items.map((item, itemIndex) => itemIndex === index ? e.target.value : item))} maxLength={80} required/>{options.length > 2 ? <button type="button" aria-label={`${index + 1}. seçeneği kaldır`} onClick={() => setOptions((items) => items.filter((_, itemIndex) => itemIndex !== index))}>×</button> : null}</span></label>)}</fieldset>{options.length < 4 ? <SecondaryButton type="button" onClick={() => setOptions((items) => [...items, ''])}>Seçenek ekle</SecondaryButton> : null}<label>Süre<select value={durationDays} onChange={(e) => setDurationDays(e.target.value)}><option value="1">1 gün</option><option value="3">3 gün</option><option value="7">7 gün</option><option value="0">Süresiz</option></select></label><label className="list-visibility"><input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)}/> Spoiler içeriyor</label>{error ? <p className="auth-message auth-message-error">{error}</p> : null}<div><SecondaryButton type="button" onClick={onCancel} disabled={saving}>Vazgeç</SecondaryButton><PrimaryButton type="submit" disabled={saving}>{saving ? 'Anket oluşturuluyor…' : 'Anketi yayınla'}</PrimaryButton></div></form>
}

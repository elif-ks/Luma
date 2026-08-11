import { useEffect, useRef, useState } from 'react'
import { Modal, PrimaryButton, SecondaryButton } from '../../design-system'
import { createDiaryEntry, deleteDiaryEntry, todayDateKey } from '../../services/diary'
import { setLibraryStatus } from '../../services/library'
import { getTmdbImageUrl, toYear } from '../../services/tmdbHelpers'

export function DiaryEntryModal({ user, media, onClose, onSaved, initialDate, onChangeMedia }) {
  const [date, setDate] = useState(initialDate || todayDateKey())
  const [rating, setRating] = useState('')
  const [note, setNote] = useState('')
  const [rewatch, setRewatch] = useState(false)
  const [shareToFeed, setShareToFeed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { mounted.current = false; document.body.style.overflow = previous }
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    if (saving || saved) return
    setSaving(true); setError('')
    let entryId = ''
    try {
      const result = await createDiaryEntry({ uid: user.uid, mediaType: media.mediaType, mediaId: media.mediaId, title: media.title, posterPath: media.posterPath, releaseDate: media.releaseDate, watchedDate: date, rating, note, rewatch, shareToFeed })
      entryId = result.id
      try {
        await setLibraryStatus({ uid: user.uid, media, status: 'watched', value: true })
      } catch (libraryError) {
        try { await deleteDiaryEntry(user.uid, entryId) } catch {}
        throw new Error(`Günlük kaydı geri alındı: ${libraryError.message}`)
      }
      onSaved?.(result.activityWarning)
      if (!mounted.current) return
      if (result.activityWarning) {
        setSaved(true)
        setError(result.activityWarning)
      } else onClose()
    } catch (submitError) {
      if (mounted.current) setError(submitError.message)
    } finally {
      if (mounted.current) setSaving(false)
    }
  }

  const poster = getTmdbImageUrl(media.posterPath, 'w185')
  return <Modal title="Günlüğe ekle" footer={<><SecondaryButton type="button" onClick={onClose} disabled={saving}>{saved ? 'Kapat' : 'İptal'}</SecondaryButton><PrimaryButton type="submit" form="diary-entry-form" disabled={saving || saved}>{saving ? 'Kaydediliyor…' : saved ? 'Kaydedildi' : 'Kaydet'}</PrimaryButton></>}>
    <form id="diary-entry-form" className="diary-entry-form" onSubmit={submit}>
      {error ? <p className={`auth-message ${saved ? 'auth-message-warning' : 'auth-message-error'}`}>{error}</p> : null}
      <div className="diary-modal-media">{poster ? <img src={poster} alt=""/> : <span>Luma</span>}<div><strong>{media.title}</strong><small>{toYear(media.releaseDate)} · {media.mediaType === 'tv' ? 'Dizi' : 'Film'}</small></div>{onChangeMedia ? <button type="button" onClick={onChangeMedia} disabled={saving || saved}>Seçimi değiştir</button> : null}</div>
      <label><span>İzleme tarihi</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} required disabled={saved}/></label>
      <fieldset disabled={saved}><legend>Puan (isteğe bağlı)</legend><div className="diary-rating-picker">{[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} aria-label={`${value} yıldız`} aria-pressed={Number(rating) === value} className={Number(rating) >= value ? 'active' : ''} onClick={() => setRating(Number(rating) === value ? '' : value)}>★</button>)}</div></fieldset>
      <label><span>Kısa not</span><textarea value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="Bu izleme hakkında kısa bir not…" disabled={saved}/><small>{Array.from(note).length}/500</small></label>
      <label className="diary-check"><input type="checkbox" checked={rewatch} onChange={(event) => setRewatch(event.target.checked)} disabled={saved}/> Yeniden izledim</label>
      <label className="diary-check diary-share-check"><input type="checkbox" checked={shareToFeed} aria-checked={shareToFeed} onChange={(event) => setShareToFeed(event.target.checked)} disabled={saving || saved}/><span><strong>Akışta paylaş</strong><small>Takipçilerin bu izleme aktivitesini görebilir.</small></span></label>
    </form>
  </Modal>
}

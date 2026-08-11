import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { deleteDiaryEntry, subscribeToUserDiary, timestampToDateKey, todayDateKey, updateDiaryEntry } from '../services/diary'
import { DiaryCalendar } from '../components/diary/DiaryCalendar'
import { DiaryStats } from '../components/diary/DiaryStats'
import { DiaryEntry } from '../components/diary/DiaryEntry'
import { EmptyState } from '../components/shared/EmptyState'
import { ErrorState } from '../components/shared/ErrorState'
import { Modal, PrimaryButton, SecondaryButton } from '../design-system'
import { DiaryCreateFlow } from '../components/diary/DiaryCreateFlow'
import { hasActivity } from '../services/activities'

export function DiaryPage() {
  const { user, authLoading } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState('')
  const [filter, setFilter] = useState('all')
  const [year, setYear] = useState('all')
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({ date: '', rating: '', note: '', rewatch: false, shareToFeed: false })
  const [saving, setSaving] = useState(false)
  const [createDate, setCreateDate] = useState('')

  useEffect(() => {
    if (authLoading) return undefined
    if (!user?.uid) { setEntries([]); setLoading(false); return undefined }
    setLoading(true); setError('')
    return subscribeToUserDiary(user.uid, (items) => { setEntries(items); setLoading(false) }, (e) => { setError(e.message); setLoading(false) })
  }, [authLoading, user?.uid])

  const now = new Date()
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const stats = {
    total: entries.length,
    thisMonth: entries.filter((item) => timestampToDateKey(item.watchedAt).startsWith(monthPrefix)).length,
    movies: entries.filter((item) => item.mediaType === 'movie').length,
    tv: entries.filter((item) => item.mediaType === 'tv').length,
    rewatches: entries.filter((item) => item.rewatch).length
  }
  const years = [...new Set(entries.map((item) => timestampToDateKey(item.watchedAt).slice(0, 4)).filter(Boolean))].sort((a, b) => b - a)
  const visible = useMemo(() => entries.filter((item) => {
    const dateKey = timestampToDateKey(item.watchedAt)
    if (selectedDate && dateKey !== selectedDate) return false
    if (year !== 'all' && !dateKey.startsWith(year)) return false
    if (filter === 'movie' && item.mediaType !== 'movie') return false
    if (filter === 'tv' && item.mediaType !== 'tv') return false
    if (filter === 'rewatch' && !item.rewatch) return false
    return true
  }), [entries, filter, selectedDate, year])
  const groups = useMemo(() => visible.reduce((result, item) => {
    const key = timestampToDateKey(item.watchedAt) || 'Tarihsiz'
    if (!result[key]) result[key] = []
    result[key].push(item)
    return result
  }, {}), [visible])

  const openEdit = async (entry) => {
    setEditing(entry); setError('')
    setEditForm({ date: timestampToDateKey(entry.watchedAt), rating: entry.rating ?? '', note: entry.note || '', rewatch: Boolean(entry.rewatch), shareToFeed: false })
    try { const shared = await hasActivity('watched', entry.id); setEditForm((value) => ({ ...value, shareToFeed: shared })) }
    catch (activityError) { setError(activityError.message) }
  }
  const saveEdit = async (event) => {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const result = await updateDiaryEntry(user.uid, editing.id, { mediaType: editing.mediaType, mediaKey: editing.mediaKey, watchedDate: editForm.date, rating: editForm.rating, note: editForm.note, rewatch: editForm.rewatch, shareToFeed: editForm.shareToFeed })
      if (result.activityWarning) setError(result.activityWarning)
      else setEditing(null)
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }
  const remove = async (entry) => {
    if (!window.confirm('Bu günlük kaydını silmek istediğine emin misin?')) return
    try { await deleteDiaryEntry(user.uid, entry.id) } catch (e) { setError(e.message) }
  }

  if (authLoading) return <div className="list-loading">Oturum kontrol ediliyor…</div>
  if (!user) return <div className="page-stack"><section className="review-hero-card"><p className="eyebrow">Kişisel günlük</p><h1>Diary</h1><p>Günlüğüne yapım eklemek ve kayıtlarını görüntülemek için giriş yapmalısın.</p><Link className="primary-btn" to="/login" state={{ from: '/diary' }}>Günlüğe eklemek için giriş yap</Link></section></div>

  return <div className="page-stack">
    <section className="review-hero-card diary-hero-actions"><div><p className="eyebrow">Kişisel film ve dizi günlüğü</p><h1>Diary</h1><p>İzleme geçmişini tarihler, puanlar ve kısa notlarla sakla.</p></div><PrimaryButton type="button" onClick={() => setCreateDate(todayDateKey())}>+ Günlüğe ekle</PrimaryButton></section>
    <DiaryStats stats={stats} />
    <section className="card-section diary-real-layout">
      <DiaryCalendar month={month} setMonth={setMonth} entries={entries} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      <div className="diary-content-column">
        <div className="diary-filters">
          {[['all', 'Tümü'], ['movie', 'Filmler'], ['tv', 'Diziler'], ['rewatch', 'Yeniden izlenenler']].map(([key, label]) => <button type="button" key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}</button>)}
          <label><span className="sr-only">Yıl</span><select value={year} onChange={(e) => setYear(e.target.value)}><option value="all">Tüm yıllar</option>{years.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          {selectedDate ? <><PrimaryButton type="button" onClick={() => setCreateDate(selectedDate)}>Bu güne yapım ekle</PrimaryButton><button type="button" onClick={() => setSelectedDate('')}>Gün seçimini temizle</button></> : null}
        </div>
        {loading ? <div className="list-loading">Günlük kayıtları yükleniyor…</div> : error && !editing ? <ErrorState message={error} /> : visible.length ? <div className="diary-groups">{Object.entries(groups).map(([date, items]) => <section key={date}><h2>{date === 'Tarihsiz' ? date : new Date(`${date}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</h2><div className="diary-entry-list">{items.map((item) => <DiaryEntry key={item.id} entry={item} onEdit={openEdit} onDelete={remove} />)}</div></section>)}</div> : entries.length ? <EmptyState title="Sonuç bulunamadı" message="Seçtiğin filtrelere uygun günlük kaydı yok." /> : <div className="diary-empty"><EmptyState title="Günlüğün henüz boş" message="Günlüğün henüz boş. İzlediğin bir filmi veya diziyi günlüğüne ekleyebilirsin." /><Link className="primary-btn" to="/discover">Yapım keşfet</Link></div>}
      </div>
    </section>
    {editing ? <Modal title="Günlük kaydını düzenle" footer={<><SecondaryButton onClick={() => setEditing(null)} disabled={saving}>İptal</SecondaryButton><PrimaryButton type="submit" form="diary-edit-form" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</PrimaryButton></>}>
      <form id="diary-edit-form" className="diary-entry-form" onSubmit={saveEdit}>
        {error ? <p className="auth-message auth-message-error">{error}</p> : null}
        <label><span>İzleme tarihi</span><input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} required /></label>
        <label><span>Puan</span><select value={editForm.rating} onChange={(e) => setEditForm({ ...editForm, rating: e.target.value })}><option value="">Puan yok</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} yıldız</option>)}</select></label>
        <label><span>Kısa not</span><textarea maxLength={500} value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} /><small>{Array.from(editForm.note).length}/500</small></label>
        <label className="diary-check"><input type="checkbox" checked={editForm.rewatch} onChange={(e) => setEditForm({ ...editForm, rewatch: e.target.checked })} /> Yeniden izledim</label>
        <label className="diary-check diary-share-check"><input type="checkbox" checked={editForm.shareToFeed} onChange={(e) => setEditForm({ ...editForm, shareToFeed: e.target.checked })} /><span><strong>Akışta paylaş</strong><small>Takipçilerin bu izleme aktivitesini görebilir.</small></span></label>
      </form>
    </Modal> : null}
    {createDate ? <DiaryCreateFlow user={user} initialDate={createDate} onClose={() => setCreateDate('')} /> : null}
  </div>
}

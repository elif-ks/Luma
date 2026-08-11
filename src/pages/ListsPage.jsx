import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ListHero } from '../components/lists/ListHero'
import { ListCard } from '../components/lists/ListCard'
import { EmptyState } from '../components/shared/EmptyState'
import { ErrorState } from '../components/shared/ErrorState'
import { Modal, PrimaryButton, SecondaryButton } from '../design-system'
import { useAuth } from '../context/AuthContext'
import { createList, subscribeToPublicLists, subscribeToSharedLists, subscribeToUserLists } from '../services/lists'
import { getProfileByUid } from '../services/profile'

async function addOwners(lists) {
  const cache = new Map()
  return Promise.all(lists.map(async (list) => {
    if (!cache.has(list.ownerUid)) cache.set(list.ownerUid, getProfileByUid(list.ownerUid).catch(() => null))
    return { ...list, authorProfile: await cache.get(list.ownerUid) }
  }))
}

export function ListsPage() {
  const { user, authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mine, setMine] = useState([])
  const [publicLists, setPublicLists] = useState([])
  const [sharedLists, setSharedLists] = useState([])
  const [sharedLoading, setSharedLoading] = useState(false)
  const [sharedError, setSharedError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', isPublic: true })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    setLoading(true); setError('')
    let active = true
    let publicRequest = 0; let mineRequest = 0
    let publicReady = false; let mineReady = !user?.uid
    const done = () => { if (active && publicReady && mineReady) setLoading(false) }
    const stopPublic = subscribeToPublicLists(async (items) => { const request = ++publicRequest; const enriched = await addOwners(items); if (!active || request !== publicRequest) return; setPublicLists(enriched); publicReady = true; done() }, (e) => { if (active) { setError(e.message); setLoading(false) } })
    const stopMine = user?.uid ? subscribeToUserLists(user.uid, async (items) => { const request = ++mineRequest; const enriched = await addOwners(items); if (!active || request !== mineRequest) return; setMine(enriched); mineReady = true; done() }, (e) => { if (active) { setError(e.message); setLoading(false) } }) : () => setMine([])
    return () => { active = false; stopPublic?.(); stopMine?.() }
  }, [user?.uid])

  useEffect(() => {
    if (authLoading) { setSharedLoading(true); return undefined }
    if (!user?.uid) { setSharedLists([]); setSharedLoading(false); setSharedError(''); return undefined }
    let active = true
    let requestId = 0
    setSharedLoading(true); setSharedError('')
    const stop = subscribeToSharedLists(user.uid, async (items) => {
      const request = ++requestId
      try {
        const enriched = await addOwners(items)
        if (active && request === requestId) { setSharedLists(enriched); setSharedError(''); setSharedLoading(false) }
      } catch (loadError) {
        if (import.meta.env.DEV) console.error('[collaborative-lists:ui-merge]', { code: loadError?.code || 'unknown', message: loadError?.message || 'Bilinmeyen hata' })
        if (active && request === requestId) { setSharedError('Ortak listeler yüklenirken bir sorun oluştu.'); setSharedLoading(false) }
      }
    }, (e) => { if (active) { setSharedError(e.message); setSharedLoading(false) } })
    return () => { active = false; stop?.() }
  }, [authLoading, user?.uid])

  const openCreate = () => {
    if (!user?.uid) { navigate('/login', { state: { from: location.pathname } }); return }
    setForm({ title: '', description: '', isPublic: true }); setFormError(''); setModalOpen(true)
  }
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setFormError('')
    try { await createList({ ownerUid: user.uid, ...form }); setModalOpen(false) }
    catch (e) { setFormError(e.message) } finally { setSaving(false) }
  }
  const community = publicLists.filter((list) => list.ownerUid !== user?.uid)

  return <div className="page-stack">
    <ListHero title="Listeler" subtitle="Sevdiğin yapımları bir araya getir, kendi koleksiyonlarını oluştur." />
    <section className="card-section">
      <div className="section-heading"><div><p className="eyebrow">Koleksiyonların</p><h2>Listelerim</h2></div><PrimaryButton onClick={openCreate} disabled={authLoading}>Yeni liste oluştur</PrimaryButton></div>
      {!user && !authLoading ? <EmptyState title="Listelerin burada görünecek" message="Liste oluşturmak için giriş yap." /> : loading ? <div className="list-loading">Listeler yükleniyor…</div> : error ? <ErrorState message={error} onRetry={() => window.location.reload()} /> : mine.length ? <div className="review-grid">{mine.map((list) => <ListCard key={list.id} list={list} />)}</div> : <EmptyState title="Henüz listen yok" message="İlk özel listeni oluşturarak başla." />}
    </section>
    <section className="card-section"><div className="section-heading"><div><p className="eyebrow">Birlikte oluştur</p><h2>Ortak Listeler</h2></div></div>
      {!user ? <EmptyState title="Ortak listelerin burada görünecek" message="Ortak olduğun listeleri görmek için giriş yap." /> : sharedLoading ? <div className="list-loading">Ortak listeler yükleniyor…</div> : sharedError ? <ErrorState message={sharedError} /> : sharedLists.length ? <div className="review-grid compact-grid">{sharedLists.map((list) => <ListCard key={list.id} list={list} role={list.currentRole} />)}</div> : <EmptyState title="Henüz ortak olduğun bir liste yok." message="Bir liste sahibi seni editör veya görüntüleyici olarak eklediğinde burada görünecek." />}
    </section>
    <section className="card-section"><div className="section-heading"><div><p className="eyebrow">Keşfet</p><h2>Topluluk Listeleri</h2></div></div>
      {loading ? <div className="list-loading">Topluluk listeleri yükleniyor…</div> : error ? <ErrorState message={error} onRetry={() => window.location.reload()} /> : community.length ? <div className="review-grid compact-grid">{community.map((list) => <ListCard key={list.id} list={list} />)}</div> : <EmptyState title="Henüz topluluk listesi yok" message="Herkese açık listeler burada görünecek." />}
    </section>
    {modalOpen ? <Modal title="Yeni liste oluştur" footer={<><SecondaryButton onClick={() => setModalOpen(false)} disabled={saving}>Vazgeç</SecondaryButton><PrimaryButton type="submit" form="create-list-form" disabled={saving}>{saving ? 'Oluşturuluyor…' : 'Listeyi oluştur'}</PrimaryButton></>}><form id="create-list-form" className="list-form" onSubmit={submit}>{formError ? <p className="auth-message auth-message-error">{formError}</p> : null}<label>Liste adı<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={60} required /></label><label>Açıklama<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={300} /></label><label className="list-visibility"><input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} /> Herkese açık</label></form></Modal> : null}
  </div>
}

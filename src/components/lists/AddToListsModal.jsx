import { useEffect, useMemo, useState } from 'react'
import { Modal, PrimaryButton, SecondaryButton } from '../../design-system'
import { useAuth } from '../../context/AuthContext'
import { addItemToList, createList, getListItem, removeItemFromList, subscribeToSharedLists, subscribeToUserLists } from '../../services/lists'

export function AddToListsModal({ movie, onClose, mediaType = 'movie', isWatchlisted = false, onToggleWatchlist, watchlistLoading = false }) {
  const { user } = useAuth()
  const [lists, setLists] = useState([])
  const [selected, setSelected] = useState({})
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState('')
  const [watchlistPending, setWatchlistPending] = useState(false)
  const [message, setMessage] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', isPublic: true })
  const media = { mediaId: movie.id, mediaType, title: movie.title || movie.name, posterPath: movie.poster_path || '', releaseDate: movie.release_date || movie.first_air_date || '' }
  const ownedLists = useMemo(() => lists.filter((list) => list.currentRole === 'owner'), [lists])
  const sharedLists = useMemo(() => lists.filter((list) => list.currentRole !== 'owner'), [lists])
  const watchlistBusy = watchlistPending || watchlistLoading

  useEffect(() => {
    let active = true
    let requestId = 0
    let owned = []
    let shared = []
    let ownedReady = false
    let sharedReady = false
    const update = async () => {
      if (!ownedReady || !sharedReady) return
      const currentRequest = ++requestId
      const items = [...owned.map((list) => ({ ...list, currentRole: 'owner' })), ...shared]
      const entries = await Promise.all(items.map(async (list) => [list.id, Boolean(await getListItem(list.id, mediaType, movie.id))]))
      if (!active || currentRequest !== requestId) return
      setLists(items)
      setSelected(Object.fromEntries(entries))
      setLoading(false)
    }
    const fail = (error) => { if (active) { setMessage(error.message); setLoading(false) } }
    const stopOwned = subscribeToUserLists(user.uid, (items) => { owned = items; ownedReady = true; void update() }, fail)
    const stopShared = subscribeToSharedLists(user.uid, (items) => { shared = items; sharedReady = true; void update() }, fail)
    return () => { active = false; stopOwned?.(); stopShared?.() }
  }, [mediaType, movie.id, user.uid])

  const toggleWatchlist = async () => {
    if (watchlistBusy || !onToggleWatchlist) return
    const wasWatchlisted = isWatchlisted
    setWatchlistPending(true)
    setMessage('')
    try {
      const succeeded = await onToggleWatchlist()
      if (succeeded !== false) setMessage(wasWatchlisted ? 'İzleme listenden çıkarıldı.' : 'İzleme listene eklendi.')
    } catch (error) {
      setMessage(error.message || 'İzleme listesi güncellenemedi.')
    } finally {
      setWatchlistPending(false)
    }
  }

  const toggle = async (list) => {
    setPending(list.id)
    setMessage('')
    try {
      if (selected[list.id]) {
        await removeItemFromList(list.id, user.uid, mediaType, movie.id)
        setSelected((value) => ({ ...value, [list.id]: false }))
        setMessage('Yapım listeden çıkarıldı.')
      } else {
        await addItemToList(list.id, user.uid, media)
        setSelected((value) => ({ ...value, [list.id]: true }))
        setMessage('Yapım listeye eklendi.')
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setPending('')
    }
  }

  const makeList = async (event) => {
    event.preventDefault()
    setPending('create')
    setMessage('')
    try {
      const id = await createList({ ownerUid: user.uid, ...form })
      await addItemToList(id, user.uid, media)
      setCreating(false)
      setForm({ title: '', description: '', isPublic: true })
      setMessage('Yeni liste oluşturuldu ve yapım eklendi.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setPending('')
    }
  }

  const renderLists = (items, emptyMessage) => items.length ? (
    <div className="list-picker">
      {items.map((list) => {
        const viewer = list.currentRole === 'viewer'
        return (
          <button key={list.id} type="button" className={selected[list.id] ? 'active' : ''} aria-pressed={Boolean(selected[list.id])} disabled={Boolean(pending) || viewer} onClick={() => toggle(list)}>
            <span>{list.title}</span>
            <small>{viewer ? 'Yalnızca görüntüleyici' : pending === list.id ? 'Kaydediliyor…' : selected[list.id] ? 'Eklendi' : list.currentRole === 'editor' ? `Editör · ${list.itemCount || 0} yapım` : `${list.itemCount || 0} yapım`}</small>
          </button>
        )
      })}
    </div>
  ) : <p className="list-modal-empty">{emptyMessage}</p>

  return (
    <Modal title="Listeye ekle" footer={<><SecondaryButton onClick={onClose} disabled={Boolean(pending)}>Kapat</SecondaryButton><PrimaryButton onClick={() => setCreating((value) => !value)} disabled={Boolean(pending)}>Yeni liste oluştur</PrimaryButton></>}>
      <div className="add-to-lists-content">
        {message ? <p className="auth-message">{message}</p> : null}
        <section className="system-watchlist-section" aria-labelledby="system-watchlist-title">
          <div className="system-watchlist-icon" aria-hidden="true">＋</div>
          <div><h3 id="system-watchlist-title">İzleme Listem</h3><p>Daha sonra izlemek istediklerin</p></div>
          <button type="button" className={isWatchlisted ? 'active' : ''} aria-pressed={isWatchlisted} disabled={watchlistBusy} onClick={toggleWatchlist}>{watchlistBusy ? 'Kaydediliyor…' : isWatchlisted ? 'Eklendi' : 'Ekle'}</button>
        </section>
        {creating ? <section className="list-modal-section"><h3>Yeni liste oluştur</h3><form className="list-form list-inline-form" onSubmit={makeList}><label>Liste adı<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={60} required /></label><label>Açıklama<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={300} /></label><label className="list-visibility"><input type="checkbox" checked={form.isPublic} onChange={(event) => setForm({ ...form, isPublic: event.target.checked })} /> Herkese açık</label><PrimaryButton type="submit" disabled={pending === 'create'}>{pending === 'create' ? 'Oluşturuluyor…' : 'Oluştur ve ekle'}</PrimaryButton></form></section> : null}
        {loading ? <div className="list-loading">Listelerin yükleniyor…</div> : <><section className="list-modal-section"><h3>Listelerim</h3>{renderLists(ownedLists, 'Henüz kişisel listen yok.')}</section><section className="list-modal-section"><h3>Ortak Listeler</h3>{renderLists(sharedLists, 'Henüz ortak olduğun bir liste yok.')}</section></>}
      </div>
    </Modal>
  )
}

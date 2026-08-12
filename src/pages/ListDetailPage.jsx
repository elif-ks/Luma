import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ContentLikeButton } from '../components/shared/ContentLikeButton'
import { EmptyState } from '../components/shared/EmptyState'
import { ErrorState } from '../components/shared/ErrorState'
import { UserAvatar } from '../components/shared/UserAvatar'
import { ListMembersModal } from '../components/lists/ListMembersModal'
import { ReportModal } from '../components/reports/ReportModal'
import { useAuth } from '../context/AuthContext'
import { Modal, PrimaryButton, SecondaryButton } from '../design-system'
import { deleteList, leaveSharedList, removeItemFromList, subscribeToList, subscribeToListItems, subscribeToListMembers, updateList } from '../services/lists'
import { getProfileByUid } from '../services/profile'
import { getTmdbImageUrl, toYear } from '../services/tmdbHelpers'

const ROLE_LABELS = { owner: 'Liste sahibi', editor: 'Editör', viewer: 'Görüntüleyici' }

export function ListDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, authLoading } = useAuth()
  const [list, setList] = useState(undefined)
  const [items, setItems] = useState([])
  const [members, setMembers] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [memberError, setMemberError] = useState('')
  const [editing, setEditing] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', isPublic: true })
  const [pending, setPending] = useState('')
  const [message, setMessage] = useState('')
  const deletingRef = useRef(false)
  const isOwner = Boolean(user?.uid && list?.ownerUid === user.uid)
  const memberRole = members.find((member) => member.uid === user?.uid)?.role || null
  const currentRole = isOwner ? 'owner' : memberRole
  const canModifyItems = isOwner || memberRole === 'editor'

  useEffect(() => {
    if (authLoading) return undefined
    setLoading(true); setError(''); setMemberError('')
    deletingRef.current = false
    const stopList = subscribeToList(id, (value) => { if (!deletingRef.current) { setList(value); setLoading(false) } }, (e) => { if (!deletingRef.current) { setError(e.message); setLoading(false) } })
    const stopItems = subscribeToListItems(id, (value) => { if (!deletingRef.current) setItems(value) }, (e) => { if (!deletingRef.current) setError(e.message) })
    const stopMembers = subscribeToListMembers(id, (value) => { if (!deletingRef.current) setMembers(value) }, (e) => { if (!deletingRef.current) { setMembers([]); setMemberError(e.message) } })
    return () => { deletingRef.current = true; stopList?.(); stopItems?.(); stopMembers?.() }
  }, [authLoading, id, user?.uid])

  useEffect(() => {
    const uids = [list?.ownerUid, ...members.map((member) => member.uid)].filter(Boolean)
    if (!uids.length) return undefined
    let active = true
    Promise.all([...new Set(uids)].map(async (uid) => [uid, await getProfileByUid(uid).catch(() => null)])).then((entries) => { if (active) setProfiles(Object.fromEntries(entries)) })
    return () => { active = false }
  }, [list?.ownerUid, members.map((member) => member.uid).join('|')])

  const collaborators = useMemo(() => list ? [{ uid: list.ownerUid, role: 'owner' }, ...members] : [], [list, members])
  const openEdit = () => { setForm({ title: list.title, description: list.description, isPublic: list.isPublic }); setMessage(''); setEditing(true) }
  const save = async (event) => { event.preventDefault(); setPending('save'); setMessage(''); try { await updateList(id, form); setEditing(false); setMessage('Liste güncellendi.') } catch (e) { setMessage(e.message) } finally { setPending('') } }
  const remove = async (item) => { setPending(item.id); setMessage(''); try { await removeItemFromList(id, user.uid, item.mediaType, item.mediaId) } catch (e) { setMessage(e.message) } finally { setPending('') } }
  const destroy = async () => { if (!window.confirm('Bu listeyi ve içindeki tüm yapımları silmek istediğine emin misin?')) return; deletingRef.current = true; setPending('delete'); setMessage(''); try { await deleteList(id, user.uid); navigate('/lists', { replace: true }) } catch (e) { deletingRef.current = false; setMessage(e.message); setPending('') } }
  const leave = async () => { setPending('leave'); setMessage(''); try { await leaveSharedList(id, user.uid); setLeaveConfirmOpen(false); navigate('/lists', { replace: true }) } catch (e) { setMessage(e.message) } finally { setPending('') } }
  const openReport = () => { if (!user) { navigate('/login', { state: { from: `${location.pathname}${location.search}` } }); return } setReportOpen(true) }

  if (loading || authLoading) return <div className="page-stack"><div className="list-loading">Liste yükleniyor…</div></div>
  if (error) return <div className="page-stack"><ErrorState message={error} onRetry={() => window.location.reload()} /></div>
  if (!list) return <div className="page-stack"><EmptyState title="Liste bulunamadı" message="Liste silinmiş veya bu listeye erişim iznin yok." /></div>

  return <div className="page-stack">
    <section className="review-hero-card list-detail-hero"><p className="eyebrow">{list.isPublic ? 'Herkese açık liste' : currentRole ? 'Özel ortak liste' : 'Özel liste'}</p><h1>{list.title}</h1><p>{list.description || 'Bu liste için açıklama eklenmedi.'}</p><span>{list.itemCount || 0} yapım</span>{currentRole ? <span className="list-current-role">Rolün: {ROLE_LABELS[currentRole]}</span> : null}<div className="list-collaborators" aria-label="Liste ortakları">{collaborators.slice(0,4).map((member) => { const profile=profiles[member.uid]; return profile?.username ? <Link key={member.uid} to={`/profile/${encodeURIComponent(profile.username)}`} title={`${profile.username} · ${ROLE_LABELS[member.role]}`}><UserAvatar profile={profile} name={profile.username} className="avatar"/><span>{profile.username}</span><small>{ROLE_LABELS[member.role]}</small></Link> : <div key={member.uid}><UserAvatar profile={profile} name="Kullanıcı" className="avatar"/><span>Kullanıcı</span><small>{ROLE_LABELS[member.role]}</small></div> })}{collaborators.length>4?<span className="list-collaborator-more">+{collaborators.length-4}</span>:null}</div><ContentLikeButton type="list" contentId={list.id} enabled={list.isPublic === true} className="content-like-detail"/>{isOwner ? <div className="list-owner-actions"><SecondaryButton onClick={()=>setMembersOpen(true)}>Ortakları yönet</SecondaryButton><SecondaryButton onClick={openEdit}>Düzenle</SecondaryButton><SecondaryButton onClick={destroy} disabled={pending === 'delete'}>{pending === 'delete' ? 'Siliniyor…' : 'Listeyi sil'}</SecondaryButton></div> : <div className="list-owner-actions">{memberRole ? <SecondaryButton onClick={()=>setLeaveConfirmOpen(true)}>Listeden ayrıl</SecondaryButton> : null}{list.isPublic ? <SecondaryButton onClick={openReport}>Listeyi şikâyet et</SecondaryButton> : null}</div>}</section>
    {message ? <p className="auth-message">{message}</p> : null}
    {memberError ? <p className="auth-message auth-message-error">Liste ortakları yüklenemedi. Liste ve yapımlar görüntülenmeye devam ediyor.</p> : null}
    <section className="card-section"><div className="section-heading"><div><p className="eyebrow">Liste içeriği</p><h2>Yapımlar</h2></div></div>{items.length ? <div className="real-list-grid">{items.map((item) => { const poster = getTmdbImageUrl(item.posterPath, 'w342'); const content = <><div className="real-list-poster">{poster ? <img src={poster} alt={`${item.title} posteri`} /> : <span>Luma</span>}</div><h3>{item.title}</h3><p>{toYear(item.releaseDate)} · {item.mediaType === 'tv' ? 'Dizi' : 'Film'}</p></>; return <article key={item.id} className="real-list-item"><Link to={`/${item.mediaType}/${item.mediaId}`}>{content}</Link>{canModifyItems ? <button type="button" onClick={() => remove(item)} disabled={Boolean(pending)}>{pending === item.id ? 'Çıkarılıyor…' : 'Listeden çıkar'}</button> : null}</article> })}</div> : <EmptyState title="Liste boş" message="Bu listeye henüz bir yapım eklenmedi." />}</section>
    {editing ? <Modal title="Listeyi düzenle" footer={<><SecondaryButton onClick={() => setEditing(false)} disabled={pending === 'save'}>Vazgeç</SecondaryButton><PrimaryButton type="submit" form="edit-list-form" disabled={pending === 'save'}>{pending === 'save' ? 'Kaydediliyor…' : 'Kaydet'}</PrimaryButton></>}><form id="edit-list-form" className="list-form" onSubmit={save}><label>Liste adı<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={60} required /></label><label>Açıklama<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={300} /></label><label className="list-visibility"><input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} /> Herkese açık</label></form></Modal> : null}
    {membersOpen ? <ListMembersModal listId={id} ownerUid={list.ownerUid} currentUid={user.uid} members={members} onClose={()=>setMembersOpen(false)}/> : null}
    {leaveConfirmOpen ? <Modal title="Ortak listeden ayrıl" onClose={()=>setLeaveConfirmOpen(false)} footer={<><SecondaryButton onClick={()=>setLeaveConfirmOpen(false)} disabled={pending==='leave'}>Vazgeç</SecondaryButton><PrimaryButton onClick={leave} disabled={pending==='leave'}>{pending==='leave'?'Ayrılınıyor…':'Listeden ayrıl'}</PrimaryButton></>}><p>Bu ortak listeden ayrılmak istediğine emin misin? Listedeki yapımlar silinmez.</p></Modal> : null}
    {reportOpen ? <ReportModal targetType="list" targetId={list.id} onClose={() => setReportOpen(false)} /> : null}
  </div>
}

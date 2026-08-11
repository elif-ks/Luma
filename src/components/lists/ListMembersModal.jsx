import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSafety } from '../../context/SafetyContext'
import { Modal, PrimaryButton, SecondaryButton } from '../../design-system'
import { addListMember, removeListMember, updateListMemberRole } from '../../services/lists'
import { getProfileByUid, searchProfilesByUsername } from '../../services/profile'
import { UserAvatar } from '../shared/UserAvatar'

export function ListMembersModal({ listId, ownerUid, currentUid, members, onClose }) {
  const { blockedUids } = useSafety()
  const [profiles, setProfiles] = useState({})
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [role, setRole] = useState('viewer')
  const [searching, setSearching] = useState(false)
  const [pending, setPending] = useState('')
  const [message, setMessage] = useState('')
  const requestId = useRef(0)
  const memberUids = useMemo(() => new Set(members.map((member) => member.uid)), [members])

  useEffect(() => {
    let active = true
    Promise.all(members.map(async (member) => [member.uid, await getProfileByUid(member.uid).catch(() => null)])).then((entries) => { if (active) setProfiles(Object.fromEntries(entries)) })
    return () => { active = false }
  }, [members.map((member) => member.uid).join('|')])

  useEffect(() => {
    const value = query.trim()
    const currentRequest = ++requestId.current
    if (value.length < 2) { setResults([]); setSearching(false); return undefined }
    const timer = setTimeout(async () => {
      setSearching(true); setMessage('')
      try {
        const found = await searchProfilesByUsername(value, 12)
        if (requestId.current === currentRequest) setResults(found.filter((profile) => profile.uid !== ownerUid && !blockedUids.has(profile.uid)))
      } catch (error) { if (requestId.current === currentRequest) setMessage(error.message) }
      finally { if (requestId.current === currentRequest) setSearching(false) }
    }, 325)
    return () => clearTimeout(timer)
  }, [query, ownerUid, blockedUids])

  const add = async () => {
    if (!selected) return
    setPending(`add:${selected.uid}`); setMessage('')
    try { await addListMember(listId, currentUid, selected.uid, role); setMessage('Ortak listeye eklendi.'); setSelected(null); setQuery(''); setResults([]) }
    catch (error) { setMessage(error.message) } finally { setPending('') }
  }
  const changeRole = async (member, nextRole) => { setPending(`role:${member.uid}`); setMessage(''); try { await updateListMemberRole(listId, currentUid, member.uid, nextRole) } catch (error) { setMessage(error.message) } finally { setPending('') } }
  const remove = async (member) => { if (!window.confirm('Bu ortağı listeden çıkarmak istediğine emin misin?')) return; setPending(`remove:${member.uid}`); setMessage(''); try { await removeListMember(listId, currentUid, member.uid); setMessage('Ortak listeden çıkarıldı.') } catch (error) { setMessage(error.message) } finally { setPending('') } }

  return <Modal title="Ortakları yönet" onClose={onClose} footer={<SecondaryButton onClick={onClose} disabled={Boolean(pending)}>Kapat</SecondaryButton>}><div className="list-members-modal">{message ? <p className="auth-message">{message}</p> : null}<section><h3>Yeni ortak ekle</h3><label className="member-search"><span>Kullanıcı adı</span><input value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null) }} placeholder="En az 2 karakter yaz" /></label>{searching ? <div className="list-loading">Kullanıcılar aranıyor…</div> : results.length ? <div className="member-search-results">{results.map((profile) => { const exists = memberUids.has(profile.uid); return <button type="button" key={profile.uid} disabled={exists} className={selected?.uid===profile.uid?'active':''} onClick={()=>setSelected(profile)}><UserAvatar profile={profile} name={profile.username} className="avatar"/><span><strong>{profile.username}</strong><small>{exists?'Zaten ortak':profile.bio?.slice(0,80)||'Luma üyesi'}</small></span></button> })}</div> : query.trim().length >= 2 ? <p>Uygun kullanıcı bulunamadı.</p> : null}{selected ? <div className="member-add-row"><div><UserAvatar profile={selected} name={selected.username} className="avatar"/><strong>{selected.username}</strong></div><label><span>Rol</span><select value={role} onChange={(event)=>setRole(event.target.value)}><option value="editor">Editör</option><option value="viewer">Görüntüleyici</option></select></label><PrimaryButton onClick={add} disabled={Boolean(pending)}>{pending.startsWith('add:')?'Ekleniyor…':'Ortak ekle'}</PrimaryButton></div> : null}</section><section><h3>Mevcut ortaklar</h3>{members.length ? <div className="member-list">{members.map((member) => { const profile=profiles[member.uid]; return <div key={member.uid} className="member-row"><Link to={profile?.username?`/profile/${encodeURIComponent(profile.username)}`:'#'}><UserAvatar profile={profile} name={profile?.username||'Kullanıcı'} className="avatar"/><strong>{profile?.username||'Kullanıcı'}</strong></Link><select aria-label={`${profile?.username||'Kullanıcı'} rolü`} value={member.role} disabled={Boolean(pending)} onChange={(event)=>changeRole(member,event.target.value)}><option value="editor">Editör</option><option value="viewer">Görüntüleyici</option></select><button type="button" disabled={Boolean(pending)} onClick={()=>remove(member)}>{pending===`remove:${member.uid}`?'Çıkarılıyor…':'Listeden çıkar'}</button></div> })}</div> : <p>Bu listede henüz ortak yok.</p>}</section></div></Modal>
}

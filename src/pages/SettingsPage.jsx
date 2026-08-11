import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSafety } from '../context/SafetyContext'
import { getPostProfile } from '../services/posts'
import { setFavoritesVisibility, setWatchedVisibility, subscribeToLibraryPrivacy } from '../services/libraryPrivacy'
import { UserAvatar } from '../components/shared/UserAvatar'
import { EmptyState } from '../components/shared/EmptyState'

function SafetyList({ items, type, empty, onRemove }) {
  const [profiles, setProfiles] = useState([])
  const [pendingUid, setPendingUid] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { let active = true; Promise.all(items.map(async (item) => ({ item, profile: await getPostProfile(item.targetUid).catch(() => null) }))).then((value) => active && setProfiles(value)); return () => { active = false } }, [items])
  const remove = async (uid) => { setPendingUid(uid); setError(''); try { await onRemove(uid) } catch (removeError) { setError(removeError.message) } finally { setPendingUid('') } }
  return profiles.length ? <>{error ? <p className="auth-message auth-message-error">{error}</p> : null}<div className="settings-safety-list">{profiles.map(({ item, profile }) => <article key={item.id}>{profile?.username ? <Link to={`/profile/${encodeURIComponent(profile.username)}`}><UserAvatar profile={profile} name={profile.username} className="avatar"/><strong>{profile.username}</strong></Link> : <div><UserAvatar name="Kullanıcı" className="avatar"/><strong>Kullanıcı artık mevcut değil</strong></div>}<button type="button" disabled={pendingUid === item.targetUid} onClick={() => remove(item.targetUid)}>{pendingUid === item.targetUid ? 'İşleniyor…' : type === 'block' ? 'Engeli kaldır' : 'Sesi aç'}</button></article>)}</div></> : <EmptyState title="Liste boş" message={empty}/>
}

function PrivacySwitch({ checked, pending, title, description, onChange, error }) {
  return <div className="privacy-setting-row"><div><h3>{title}</h3><p>{description}</p>{error ? <small className="auth-message auth-message-error">{error}</small> : null}</div><button type="button" role="switch" aria-checked={checked} aria-label={title} className={`privacy-switch${checked ? ' active' : ''}`} disabled={pending} onClick={() => onChange(!checked)}><span/>{pending ? <small>Kaydediliyor…</small> : null}</button></div>
}

export function SettingsPage() {
  const { user, authLoading } = useAuth()
  const safety = useSafety()
  const [privacy, setPrivacy] = useState({ showFavorites: false, showWatched: false })
  const [privacyLoading, setPrivacyLoading] = useState(true)
  const [pending, setPending] = useState({ favorite: false, watched: false })
  const [errors, setErrors] = useState({ favorite: '', watched: '', load: '' })

  useEffect(() => {
    setPrivacy({ showFavorites: false, showWatched: false }); setErrors({ favorite: '', watched: '', load: '' })
    if (authLoading || !user?.uid) { setPrivacyLoading(authLoading); return undefined }
    setPrivacyLoading(true)
    return subscribeToLibraryPrivacy(user.uid, (value) => { setPrivacy(value); setPrivacyLoading(false) }, (error) => { setErrors((value) => ({ ...value, load: error.message })); setPrivacyLoading(false) })
  }, [authLoading, user?.uid])

  const toggle = async (kind, value) => {
    setPending((current) => ({ ...current, [kind]: true })); setErrors((current) => ({ ...current, [kind]: '' }))
    try { await (kind === 'favorite' ? setFavoritesVisibility(user.uid, value) : setWatchedVisibility(user.uid, value)) }
    catch (error) { setErrors((current) => ({ ...current, [kind]: error.message })) }
    finally { setPending((current) => ({ ...current, [kind]: false })) }
  }

  return <div className="page-stack"><section className="discover-hero-card genre-hero"><p className="eyebrow">Güvenlik ve tercihler</p><h1>Ayarlar</h1></section><section className="profile-section-card"><h2>Profil gizliliği</h2>{privacyLoading ? <div className="list-loading">Görünürlük ayarları yükleniyor…</div> : <div className="privacy-settings-list">{errors.load ? <p className="auth-message auth-message-error">{errors.load}</p> : null}<PrivacySwitch checked={privacy.showFavorites} pending={pending.favorite} title="Favorilerimi profilimde herkese göster" description="Açık olduğunda diğer kullanıcılar favori film ve dizilerini profilinde görebilir." error={errors.favorite} onChange={(value) => toggle('favorite', value)}/><PrivacySwitch checked={privacy.showWatched} pending={pending.watched} title="İzlediklerimi profilimde herkese göster" description="Açık olduğunda diğer kullanıcılar izlediğin film ve dizileri profilinde görebilir." error={errors.watched} onChange={(value) => toggle('watched', value)}/><p className="privacy-note">İzleme Listen ve Diary kayıtların her zaman gizli kalır.</p></div>}</section>{safety.error ? <p className="auth-message auth-message-error">{safety.error}</p> : null}<section className="profile-section-card"><h2>Engellenen hesaplar</h2>{safety.loading ? <div className="list-loading">Yükleniyor…</div> : <SafetyList items={safety.blocks} type="block" empty="Engellediğin kullanıcı yok." onRemove={safety.unblock}/>}</section><section className="profile-section-card"><h2>Sessize alınan hesaplar</h2>{safety.loading ? <div className="list-loading">Yükleniyor…</div> : <SafetyList items={safety.mutes} type="mute" empty="Sessize aldığın kullanıcı yok." onRemove={safety.unmute}/>}</section></div>
}

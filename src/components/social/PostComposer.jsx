import { useCallback, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { createPost } from '../../services/posts'
import { getTmdbImageUrl, toYear } from '../../services/tmdbHelpers'
import { MediaPickerModal } from './MediaPickerModal'

export function PostComposer({ onPublished }) {
  const {user,profile}=useAuth(); const navigate=useNavigate(); const location=useLocation(); const [content,setContent]=useState(''); const [spoiler,setSpoiler]=useState(false); const [media,setMedia]=useState(null); const [picker,setPicker]=useState(false); const [saving,setSaving]=useState(false); const [message,setMessage]=useState('')
  const requireLogin=()=>{if(user)return true;navigate('/login',{state:{from:`${location.pathname}${location.search}`}});return false}
  const openPicker=()=>{if(requireLogin())setPicker(true)}
  const closePicker=useCallback(()=>setPicker(false),[])
  const publish=async()=>{if(!requireLogin())return;setMessage('');const text=content.trim();if(!text){setMessage('Gönderi metni boş bırakılamaz.');return}setSaving(true);try{const mediaKey=media?`${media.media_type}_${media.id}`:'';const id=await createPost({ownerUid:user.uid,content:text,mediaKey,spoiler});setContent('');setSpoiler(false);setMedia(null);setMessage('Gönderin yayınlandı.');onPublished?.(id)}catch(e){setMessage(e.message)}finally{setSaving(false)}}
  const name=profile?.username||user?.displayName||'Luma kullanıcısı'; const initial=name.charAt(0).toLocaleUpperCase('tr-TR')||'L'; const title=media?.title||media?.name
  return <div className="social-composer"><div className="social-avatar">{profile?.photoURL||user?.photoURL?<img src={profile?.photoURL||user.photoURL} alt=""/>:initial}</div><div className="social-composer-main"><label><span className="sr-only">Gönderi metni</span><textarea value={content} maxLength={500} onChange={e=>{setContent(e.target.value);setMessage('')}} placeholder="Bugün hangi yapım hakkında düşünüyorsun?" /></label>{media?<div className="social-selected-media">{media.poster_path?<img src={getTmdbImageUrl(media.poster_path,'w92')} alt=""/>:<span className="media-fallback">L</span>}<div><strong>{title}</strong><small>{toYear(media.release_date||media.first_air_date)} · {media.media_type==='tv'?'Dizi':'Film'}</small></div><button type="button" onClick={()=>setMedia(null)} aria-label="Yapım seçimini kaldır">×</button></div>:null}<div className="social-composer-tools"><button type="button" onClick={openPicker}>🎞 Film/Dizi seç</button><label><input type="checkbox" checked={spoiler} onChange={e=>setSpoiler(e.target.checked)} /> Spoiler</label><span>{Array.from(content).length}/500</span><button type="button" className="social-publish" disabled={saving||!content.trim()} onClick={publish}>{saving?'Yayınlanıyor…':'Yayınla'}</button></div>{message?<p className="social-form-message">{message}</p>:null}</div>{picker?<MediaPickerModal onClose={closePicker} onSelect={item=>{setMedia(item);setPicker(false)}}/>:null}</div>
}

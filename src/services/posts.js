import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from './firebase'
import { getProfileByUid } from './profile'

const profileCache = new Map()
function postError(error) {
  const code = String(error?.code || '').replace(/^firestore\//, '')
  const messages = { 'permission-denied':'Bu sosyal işlemi yapmaya yetkiniz yok.', unauthenticated:'Bu işlem için giriş yapmalısınız.', unavailable:'Sosyal akışa şu anda ulaşılamıyor.', aborted:'İşlem çakıştı. Lütfen tekrar deneyin.' }
  const mapped = new Error(messages[code] || error?.message || 'Sosyal işlem tamamlanamadı. Lütfen tekrar deneyin.')
  mapped.code = error?.code || 'posts/unknown'; return mapped
}
function millis(value) { return typeof value?.toMillis === 'function' ? value.toMillis() : typeof value?.seconds === 'number' ? value.seconds * 1000 : 0 }
function newest(items) { return [...items].sort((a,b)=>millis(b.createdAt)-millis(a.createdAt)) }
function normalizeContent(content) { const value=String(content||'').trim(); if(!value || Array.from(value).length>500) throw new Error('Gönderi 1–500 karakter arasında olmalı.'); return value }

export async function createPost({ ownerUid, content, mediaKey = '', spoiler = false }) {
  if(!ownerUid) throw new Error('Gönderi paylaşmak için giriş yapmalısınız.')
  const text=normalizeContent(content)
  try { return (await addDoc(collection(db,'posts'), { ownerUid, type:mediaKey?'media':'text', content:text, mediaKey:String(mediaKey), reviewId:'', listId:'', diaryEntryId:'', quotedPostId:'', poll:{}, spoiler:Boolean(spoiler), visibility:'public', createdAt:serverTimestamp(), updatedAt:serverTimestamp() })).id } catch(error){ throw postError(error) }
}
export async function updatePost(postId, content, spoiler) { try { await updateDoc(doc(db,'posts',postId),{content:normalizeContent(content),spoiler:Boolean(spoiler),updatedAt:serverTimestamp()}) } catch(error){ throw postError(error) } }
export async function deletePost(postId) { try { await deleteDoc(doc(db,'posts',postId)) } catch(error){ throw postError(error) } }
export async function getPost(postId) { try { const snap=await getDoc(doc(db,'posts',postId)); return snap.exists()?{id:snap.id,...snap.data()}:null } catch(error){ throw postError(error) } }

function subscribe(source,onChange,onError,limit) { return onSnapshot(source,(snap)=>{const items=newest(snap.docs.map(d=>({id:d.id,...d.data()})));onChange(limit?items.slice(0,limit):items)},error=>onError?.(postError(error))) }
export function subscribeToPublicPosts(onChange,onError,limit) { return subscribe(query(collection(db,'posts'),where('visibility','==','public')),onChange,onError,limit) }
export function subscribeToUserPosts(uid,onChange,onError) { return subscribe(query(collection(db,'posts'),where('ownerUid','==',uid)),onChange,onError) }
export function subscribeToReplies(postId,onChange,onError) { return subscribe(collection(db,'posts',postId,'replies'),onChange,onError) }
export async function createReply(postId,{ownerUid,content,spoiler=false}) {
  let replyRef
  let recipientUid=''
  try { replyRef=await addDoc(collection(db,'posts',postId,'replies'),{ownerUid,content:normalizeContent(content),spoiler:Boolean(spoiler),createdAt:serverTimestamp(),updatedAt:serverTimestamp()}) }
  catch(error){ throw postError(error) }
  try {
    const post=await getDoc(doc(db,'posts',postId))
    recipientUid=post.exists()?post.data().ownerUid:''
    if(recipientUid&&recipientUid!==ownerUid){const{createReplyNotification}=await import('./notifications');await createReplyNotification({recipientUid,postId,replyId:replyRef.id})}
  } catch(notificationError) {
    if(import.meta.env.DEV)console.error('[notification:post-reply-create]',{code:notificationError?.code,message:notificationError?.message,postId,replyId:replyRef.id,recipientUid,payload:{type:'post_reply',actorUid:ownerUid,targetType:'post',targetId:postId,sourceId:replyRef.id}})
    return{id:replyRef.id,warning:'Cevap gönderildi ancak bildirim oluşturulamadı.'}
  }
  return{id:replyRef.id,warning:''}
}

export async function deleteReply(postId,replyId,ownerUid) {
  let recipientUid=''
  try { const post=await getDoc(doc(db,'posts',postId));recipientUid=post.exists()?post.data().ownerUid:'' } catch {/* Cevap silme ana işlemi devam eder. */}
  try { await deleteDoc(doc(db,'posts',postId,'replies',replyId)) } catch(error){ throw postError(error) }
  if(recipientUid&&recipientUid!==ownerUid){try{const{removeReplyNotification}=await import('./notifications');await removeReplyNotification({recipientUid,postId,replyId,actorUid:ownerUid})}catch(notificationError){if(import.meta.env.DEV)console.error('[notification:post-reply-delete]',{code:notificationError?.code,message:notificationError?.message,postId,replyId,recipientUid});return{warning:'Cevap silindi ancak bildirimi kaldırılamadı.'}}}
  return{warning:''}
}

async function setReaction(postId,path,uid,active) { if(!uid) throw new Error('Bu işlem için giriş yapmalısınız.'); const ref=doc(db,'posts',postId,path,uid); try { const post=await getDoc(doc(db,'posts',postId));if(!post.exists())throw new Error('Gönderi bulunamadı.');if(active)await setDoc(ref,{uid,createdAt:serverTimestamp()});else await deleteDoc(ref);if(['likes','reposts'].includes(path)&&post.data().ownerUid!==uid){const type=path==='likes'?'post_like':'repost';try{const notifications=await import('./notifications');if(active)await notifications.createNotification({recipientUid:post.data().ownerUid,type,targetType:'post',targetId:postId});else await notifications.removeNotification({recipientUid:post.data().ownerUid,type,targetId:postId,actorUid:uid})}catch(notificationError){if(import.meta.env.DEV)console.error(`[notification:${path==='likes'?'post-like':'repost'}-${active?'create':'delete'}]`,notificationError);return{warning:'İşlem tamamlandı ancak bildirim gönderilemedi.'}}}return{warning:''} } catch(error){ throw postError(error) } }
export const setPostLike=(postId,uid,active)=>setReaction(postId,'likes',uid,active)
export const setPostRepost=(postId,uid,active)=>setReaction(postId,'reposts',uid,active)
export const setPostBookmark=(postId,uid,active)=>setReaction(postId,'bookmarks',uid,active)
export function subscribeToReactions(postId,type,onChange,onError) { return onSnapshot(collection(db,'posts',postId,type),(snap)=>onChange(snap.docs.map(d=>d.id)),error=>onError?.(postError(error))) }
export function subscribeToBookmark(postId,uid,onChange,onError) { if(!uid){onChange(false);return()=>{}} return onSnapshot(doc(db,'posts',postId,'bookmarks',uid),snap=>onChange(snap.exists()),error=>onError?.(postError(error))) }

export async function getPostProfile(uid) { if(!profileCache.has(uid)) profileCache.set(uid,getProfileByUid(uid).catch(e=>{profileCache.delete(uid);throw e})); return profileCache.get(uid) }
export async function attachPostProfiles(posts) { return Promise.all(posts.map(async post=>({...post,authorProfile:await getPostProfile(post.ownerUid).catch(()=>null)}))) }
export async function attachReplyProfiles(replies) {
  const ownerUids = [...new Set(replies.map((reply) => reply.ownerUid).filter(Boolean))]
  const profiles = new Map(await Promise.all(ownerUids.map(async (uid) => [uid, await getPostProfile(uid).catch(() => null)])))
  return replies.map((reply) => ({ ...reply, authorProfile: profiles.get(reply.ownerUid) || null }))
}
export function setCachedPostProfile(uid, profile) { if (uid) profileCache.set(uid, Promise.resolve(profile)) }
export function extractHashtags(posts) { const counts=new Map(); posts.forEach(post=>{const tags=String(post.content||'').match(/#[\p{L}\p{N}_]+/gu)||[]; new Set(tags.map(tag=>tag.slice(1).toLocaleLowerCase('tr-TR'))).forEach(tag=>counts.set(tag,(counts.get(tag)||0)+1))}); return [...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'tr')).slice(0,5).map(([tag,count])=>({tag,count})) }

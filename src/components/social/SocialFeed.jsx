import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { attachPostProfiles, subscribeToPublicPosts } from '../../services/posts'
import { EmptyState } from '../shared/EmptyState'
import { ErrorState } from '../shared/ErrorState'
import { PostComposer } from './PostComposer'
import { PostCard } from './PostCard'
import { useSafety } from '../../context/SafetyContext'

export function SocialFeed({ showComposer=true, limit, title=true, ownerUids }) {
  const {blockedUids,mutedUids}=useSafety()
  const [posts,setPosts]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('')
  useEffect(() => {
    let active = true
    let requestId = 0
    const stop = subscribeToPublicPosts(async (items) => {
      const currentRequest = ++requestId
      const filtered = ownerUids ? items.filter((item) => ownerUids.includes(item.ownerUid)) : items
      const enriched = await attachPostProfiles(filtered)
      if (!active || currentRequest !== requestId) return
      setPosts(enriched)
      setLoading(false)
      setError('')
    }, (loadError) => {
      if (!active) return
      setError(loadError.message)
      setLoading(false)
    }, ownerUids ? undefined : limit)
    return () => { active = false; stop?.() }
  }, [limit, ownerUids?.join('|')])
  const visiblePosts=posts.filter(post=>!blockedUids.has(post.ownerUid)&&!mutedUids.has(post.ownerUid))
  return <section className="card-section social-feed-section">{title?<div className="section-heading"><div><p className="eyebrow">Topluluk akışı</p><h2>Bu Hafta Konuşulanlar</h2></div><Link to="/feed">Tüm akış</Link></div>:null}{showComposer?<PostComposer/>:null}{loading?<div className="list-loading">Gönderiler yükleniyor…</div>:error?<ErrorState message={error} onRetry={()=>window.location.reload()}/>:visiblePosts.length?<div className="social-post-list">{visiblePosts.map(post=><PostCard key={post.id} post={post}/>)}</div>:<EmptyState title="Akış henüz boş" message="Gösterilecek gönderi bulunamadı."/>}</section>
}

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { attachPostProfiles, subscribeToPublicPosts } from '../services/posts'
import { PostCard } from '../components/social/PostCard'
import { EmptyState } from '../components/shared/EmptyState'
import { useSafety } from '../context/SafetyContext'

export function HashtagPage() {
  const { tag } = useParams()
  const { blockedUids, mutedUids } = useSafety()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    let requestId = 0
    const stop = subscribeToPublicPosts(async (items) => {
      const currentRequest = ++requestId
      const needle = `#${String(tag).toLocaleLowerCase('tr-TR')}`
      const filtered = items.filter((post) => (String(post.content).toLocaleLowerCase('tr-TR').match(/#[\p{L}\p{N}_]+/gu) || []).includes(needle))
      const enriched = await attachPostProfiles(filtered)
      if (active && currentRequest === requestId) { setPosts(enriched); setLoading(false) }
    }, () => { if (active) setLoading(false) })
    return () => { active = false; stop?.() }
  }, [tag])

  const visible = posts.filter((post) => !blockedUids.has(post.ownerUid) && !mutedUids.has(post.ownerUid))
  return <div className="page-stack"><section className="discover-hero-card genre-hero"><p className="eyebrow">Gündem</p><h1>#{tag}</h1></section>{loading ? <div className="list-loading">Gönderiler yükleniyor…</div> : visible.length ? <div className="social-post-list">{visible.map((post) => <PostCard key={post.id} post={post}/>)}</div> : <EmptyState title="Gönderi bulunamadı" message="Bu etiketi içeren gerçek bir gönderi yok."/>}</div>
}

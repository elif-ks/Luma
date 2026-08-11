import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { attachConversationProfiles, ensureConversation, getConversation, sendMessage, subscribeToConversations, subscribeToMessages } from '../services/messages'
import { getProfileByUid } from '../services/profile'
import { UserAvatar } from '../components/shared/UserAvatar'
import { UserPickerModal } from '../components/messages/UserPickerModal'
import { EmptyState } from '../components/shared/EmptyState'
import { useSafety } from '../context/SafetyContext'
import { useNotifications } from '../context/NotificationContext'

export function MessagesPage() {
  const { conversationId } = useParams()
  const { user, authLoading } = useAuth()
  const safety = useSafety()
  const { messageNotifications, unreadConversationIds, markConversationRead } = useNotifications()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [activeProfile, setActiveProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chatLoading, setChatLoading] = useState(false)
  const [conversationListError, setConversationListError] = useState('')
  const [activeConversationError, setActiveConversationError] = useState('')
  const [sendMessageError, setSendMessageError] = useState('')
  const [sendMessageNotice, setSendMessageNotice] = useState('')
  const [newConversationError, setNewConversationError] = useState('')
  const [picker, setPicker] = useState(false)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [relationshipBlocked, setRelationshipBlocked] = useState(false)
  const [count, setCount] = useState(30)
  const endRef = useRef(null)
  const previousLength = useRef(0)
  const previousUid = useRef(null)
  const markingRead = useRef(new Set())

  useEffect(() => {
    if (authLoading) return
    const lastUid = previousUid.current
    if (lastUid && lastUid !== user?.uid && conversationId) navigate('/messages', { replace: true })
    previousUid.current = user?.uid || null
    setConversations([])
    setMessages([])
    setActiveProfile(null)
    setConversationListError('')
    setActiveConversationError('')
    setSendMessageError('')
    setSendMessageNotice('')
    setNewConversationError('')
    setCount(30)
    setRelationshipBlocked(false)
    markingRead.current.clear()
  }, [authLoading, user?.uid])

  const activeMessageNotification = messageNotifications.find((item) => item.targetId === conversationId && !item.read)
  useEffect(() => {
    let active = true
    setRelationshipBlocked(false)
    if (!user?.uid || !activeProfile?.uid) return undefined
    safety.isBlockedEitherWay(activeProfile.uid).then((value) => { if (active) setRelationshipBlocked(value) }).catch(() => { if (active) setRelationshipBlocked(true) })
    return () => { active = false }
  }, [user?.uid, activeProfile?.uid, safety.blockedUids])
  useEffect(() => {
    if (!conversationId || !activeMessageNotification || markingRead.current.has(activeMessageNotification.sourceId)) return
    markingRead.current.add(activeMessageNotification.sourceId)
    markConversationRead(conversationId).catch((readError) => {
      markingRead.current.delete(activeMessageNotification.sourceId)
      setActiveConversationError(readError.message || 'Konuşma okundu olarak işaretlenemedi.')
    })
  }, [conversationId, activeMessageNotification?.sourceId])

  useEffect(() => {
    if (authLoading || !user?.uid) return undefined
    let active = true
    let requestId = 0
    setLoading(true)
    setConversationListError('')
    const stop = subscribeToConversations(user.uid, async (items) => {
      const currentRequest = ++requestId
      const enriched = await attachConversationProfiles(items, user.uid)
      if (!active || currentRequest !== requestId) return
      setConversations(enriched)
      setLoading(false)
      setConversationListError('')
    }, (subscriptionError) => {
      if (!active) return
      setConversationListError(subscriptionError.message || 'Konuşmalar yüklenemedi.')
      setLoading(false)
    })
    return () => { active = false; stop?.() }
  }, [authLoading, user?.uid])

  useEffect(() => {
    if (!user?.uid || !conversationId) {
      setActiveProfile(null)
      setMessages([])
      setChatLoading(false)
      setActiveConversationError('')
      return undefined
    }

    let active = true
    let stopMessages
    setChatLoading(true)
    setActiveConversationError('')
    setMessages([])
    getConversation(conversationId).then(async (conversation) => {
      if (!conversation || !conversation.participants.includes(user.uid)) throw new Error('Bu konuşmayı görüntüleme yetkiniz yok.')
      const otherUid = conversation.participants.find((uid) => uid !== user.uid)
      const otherProfile = await getProfileByUid(otherUid)
      if (!active) return
      setActiveProfile(otherProfile)
      stopMessages = subscribeToMessages(conversationId, count, (items) => {
        setMessages(items)
        setChatLoading(false)
        setActiveConversationError('')
      }, (subscriptionError) => {
        setActiveConversationError(subscriptionError.message || 'Mesajlar yüklenemedi.')
        setChatLoading(false)
      })
    }).catch((loadError) => {
      if (!active) return
      setActiveConversationError(loadError.message || 'Konuşma yüklenemedi.')
      setChatLoading(false)
      setActiveProfile(null)
    })
    return () => { active = false; stopMessages?.() }
  }, [conversationId, count, user?.uid])

  useEffect(() => {
    if (messages.length > previousLength.current && previousLength.current > 0) endRef.current?.scrollIntoView({ behavior: 'smooth' })
    previousLength.current = messages.length
  }, [messages.length])

  const choose = async (selectedProfile) => {
    setPicker(false)
    setNewConversationError('')
    try {
      if (await safety.isBlockedEitherWay(selectedProfile.uid)) throw new Error('Bu kullanıcıyla mesajlaşamazsın.')
      const id = await ensureConversation(user.uid, selectedProfile.uid)
      navigate(`/messages/${id}`)
    } catch (selectionError) {
      setNewConversationError(selectionError.message || 'Konuşma başlatılamadı.')
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!content.trim() || sending || !conversationId || relationshipBlocked || safety.loading) return
    setSending(true)
    setSendMessageError('')
    setSendMessageNotice('')
    try {
      const result = await sendMessage(conversationId, user.uid, content, activeProfile?.uid)
      setContent('')
      if (result.warning) setSendMessageNotice(result.warning)
    } catch (submitError) {
      setSendMessageError(submitError.message || 'Mesaj gönderilemedi.')
    } finally {
      setSending(false)
    }
  }

  const keyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(event) }
  }

  if (authLoading) return <div className="list-loading">Oturum kontrol ediliyor…</div>
  if (!user) return <section className="profile-section-card"><h1>Mesajlar</h1><p>Mesajlarını görmek için giriş yapmalısın.</p><Link className="primary-btn" to="/login" state={{ from: '/messages' }}>Giriş yap</Link></section>

  return <div className={`messages-shell${conversationId ? ' conversation-open' : ''}`}>
    <aside className="message-conversation-list">
      <header><h1>Mesajlar</h1><button type="button" onClick={() => setPicker(true)}>Yeni mesaj</button></header>
      {newConversationError ? <p className="auth-message auth-message-error message-list-error">{newConversationError}</p> : null}
      {loading ? <div className="list-loading">Konuşmalar yükleniyor…</div> : conversationListError ? <p className="auth-message auth-message-error message-list-error">{conversationListError}</p> : conversations.length ? conversations.map((conversation) => <ConversationRow key={conversation.id} conversation={conversation} active={conversation.id === conversationId} unread={unreadConversationIds.has(conversation.id)} />) : <div className="message-empty"><p>Henüz bir konuşman yok.</p><p>Yeni bir mesaj göndererek sohbet başlatabilirsin.</p><button type="button" onClick={() => setPicker(true)}>Yeni mesaj başlat</button></div>}
    </aside>
    <main className="message-chat">
      {chatLoading ? <div className="list-loading">Konuşma yükleniyor…</div> : activeConversationError ? <div className="message-active-error"><EmptyState title="Konuşma açılamadı" message={activeConversationError}/><button type="button" className="primary-btn" onClick={() => navigate('/messages')}>Mesajlara dön</button></div> : activeProfile ? <>
        <header><button type="button" className="message-back" onClick={() => navigate('/messages')}>←</button><Link to={`/profile/${encodeURIComponent(activeProfile.username)}`}><UserAvatar profile={activeProfile} name={activeProfile.username} className="avatar"/><strong>{activeProfile.username || 'Kullanıcı'}</strong></Link></header>
        <div className="message-history">{messages.length >= count ? <button className="message-more" onClick={() => setCount((value) => value + 30)}>Daha eski mesajları yükle</button> : null}{messages.length ? messages.map((message) => <div key={message.id} className={`message-bubble${message.senderUid === user.uid ? ' own' : ''}`}><p>{message.content}</p><small>{typeof message.createdAt?.toDate === 'function' ? message.createdAt.toDate().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'Şimdi'}</small></div>) : <p className="message-history-empty">Henüz mesaj yok. İlk mesajı sen gönder.</p>}<div ref={endRef}/></div>
        {sendMessageError ? <p className="auth-message auth-message-error message-error">{sendMessageError}</p> : null}
        {sendMessageNotice ? <p className="auth-message auth-message-warning message-error">{sendMessageNotice}</p> : null}
        {safety.loading ? <div className="list-loading">Güvenlik durumu kontrol ediliyor…</div> : relationshipBlocked ? <div className="message-blocked-notice"><p>Bu kullanıcıyla mesajlaşamazsın.</p>{safety.isBlocked(activeProfile.uid) ? <button type="button" onClick={()=>safety.unblock(activeProfile.uid)}>Engeli kaldır</button> : null}</div>:<form className="message-composer" onSubmit={submit}><label><span className="sr-only">Mesaj</span><textarea value={content} maxLength={1000} onChange={(event) => { setContent(event.target.value); setSendMessageError('') }} onKeyDown={keyDown} placeholder="Mesajını yaz…"/></label><span>{Array.from(content).length}/1000</span><button disabled={sending || !content.trim()}>{sending ? 'Gönderiliyor…' : 'Gönder'}</button></form>}
      </> : <EmptyState title="Mesajlar" message="Bir konuşma seç veya yeni mesaj başlat."/>}
    </main>
    {picker ? <UserPickerModal currentUid={user.uid} onSelect={choose} onClose={() => setPicker(false)}/> : null}
  </div>
}

function ConversationRow({ conversation, active, unread }) {
  const [last, setLast] = useState(null)
  useEffect(() => subscribeToMessages(conversation.id, 1, (items) => setLast(items[0] || null), () => {}), [conversation.id])
  return <Link to={`/messages/${conversation.id}`} className={`message-conversation-row${active ? ' active' : ''}${unread ? ' unread' : ''}`}><UserAvatar profile={conversation.otherProfile} name={conversation.otherProfile?.username || 'Kullanıcı'} className="avatar"/><div><strong>{conversation.otherProfile?.username || 'Kullanıcı'}</strong><p>{last?.content || 'Henüz mesaj yok.'}</p></div><span className="message-row-meta"><small>{typeof last?.createdAt?.toDate === 'function' ? last.createdAt.toDate().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : ''}</small>{unread ? <span className="message-unread-badge" aria-label="Okunmamış konuşma">Yeni</span> : null}</span></Link>
}

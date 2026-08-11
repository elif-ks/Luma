import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { useSafety } from './SafetyContext'
import { deleteNotification, markNotificationRead, markNotificationsRead, subscribeToMessageNotifications, subscribeToNotifications } from '../services/notifications'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user, authLoading } = useAuth()
  const safety = useSafety()
  const [items, setItems] = useState([])
  const [messageItems, setMessageItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setItems([]); setMessageItems([]); setError('')
    if (authLoading) { setLoading(true); return undefined }
    if (!user?.uid) { setLoading(false); return undefined }
    setLoading(true)
    return subscribeToNotifications(user.uid, (value) => { setItems(value); setLoading(false) }, (subscriptionError) => { setError(subscriptionError.message); setLoading(false) })
  }, [authLoading, user?.uid])

  useEffect(() => {
    setMessageItems([])
    if (authLoading || !user?.uid) return undefined
    return subscribeToMessageNotifications(user.uid, setMessageItems, (subscriptionError) => setError(subscriptionError.message))
  }, [authLoading, user?.uid])

  const notifications = useMemo(() => items.filter((item) => item.type !== 'message' && !safety.blockedUids.has(item.actorUid) && !safety.mutedUids.has(item.actorUid)), [items, safety.blockedUids, safety.mutedUids])
  const messageNotifications = useMemo(() => messageItems.filter((item) => !safety.blockedUids.has(item.actorUid)), [messageItems, safety.blockedUids])
  const unreadCount = notifications.filter((item) => !item.read).length
  const unreadConversationIds = useMemo(() => new Set(messageNotifications.filter((item) => !item.read).map((item) => item.targetId)), [messageNotifications])
  const unreadConversationCount = unreadConversationIds.size
  const markRead = (id, read = true) => markNotificationRead(user.uid, id, read)
  const markAllRead = () => markNotificationsRead(user.uid, notifications)
  const remove = (id) => deleteNotification(user.uid, id)
  const markConversationRead = (conversationId) => {
    const notification = messageNotifications.find((item) => item.targetId === conversationId && !item.read)
    return notification ? markNotificationRead(user.uid, notification.id) : Promise.resolve()
  }

  return <NotificationContext.Provider value={{ notifications, messageNotifications, loading, error, unreadCount, unreadConversationCount, unreadConversationIds, markRead, markAllRead, markConversationRead, remove }}>{children}</NotificationContext.Provider>
}

export const useNotifications = () => useContext(NotificationContext)

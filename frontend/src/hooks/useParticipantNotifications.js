import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/firebase/client.js'

/** In-app notifications for the signed-in user (`notifications.userId`). Read-only via Firestore rules. */
export function useParticipantNotifications(userId, max = 40) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !isFirebaseConfigured() || !userId) {
      setItems([])
      setLoading(false)
      return undefined
    }
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(max),
    )
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      () => {
        setItems([])
        setLoading(false)
      },
    )
    return () => unsub()
  }, [userId, max])

  const unreadCount = items.filter((n) => n.read !== true).length

  return { items, loading, unreadCount }
}

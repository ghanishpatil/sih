import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/firebase/client.js'

/** Firestore announcements listener. Pass `{ eventId, participantFeed, juryFeed }` to scope/filter. */
export function useAnnouncements(max = 12, opts = null) {
  const eventId = opts && typeof opts === 'object' ? opts.eventId ?? null : null
  const participantFeed = opts && typeof opts === 'object' ? Boolean(opts.participantFeed) : false
  const juryFeed = opts && typeof opts === 'object' ? Boolean(opts.juryFeed) : false

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db || !isFirebaseConfigured()) {
      setItems([])
      setLoading(false)
      return undefined
    }
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(max))
    const unsub = onSnapshot(
      q,
      (snap) => {
        let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        if (eventId) {
          rows = rows.filter((a) => !a.eventId || a.eventId === eventId)
        }
        if (participantFeed) {
          rows = rows.filter((a) => {
            const aud = a.audience || 'all'
            return aud === 'all' || aud === 'participants'
          })
        }
        if (juryFeed) {
          rows = rows.filter((a) => {
            const aud = a.audience || 'all'
            return aud === 'all' || aud === 'judges'
          })
        }
        setItems(rows)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return () => unsub()
  }, [max, eventId, participantFeed, juryFeed])

  return { items, loading }
}

import { collection, limit, onSnapshot, query } from 'firebase/firestore'
import { db } from './firebase'

export function subscribeToUsers(onChange, onError, count = 20) {
  return onSnapshot(query(collection(db, 'users'), limit(Math.min(Math.max(count, 1), 20))), (snapshot) => {
    onChange(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
  }, (error) => onError?.(new Error(error?.code === 'permission-denied' ? 'Kullanıcılar görüntülenemiyor.' : 'Kullanıcılar yüklenemedi.')))
}

import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore'
import { db, getFirebaseAuth } from './firebase'

function createListError(message, code = 'lists/unknown') {
  const error = new Error(message)
  error.code = code
  return error
}

function mapListError(error) {
  if (String(error?.code || '').startsWith('lists/')) return error
  const code = String(error?.code || '').replace(/^firestore\//, '')
  const messages = {
    'permission-denied': 'Bu listeyi görüntüleme veya değiştirme yetkiniz yok.',
    unauthenticated: 'Bu işlem için giriş yapmalısınız.',
    unavailable: 'Liste servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin.',
    aborted: 'Liste aynı anda güncellendi. Lütfen tekrar deneyin.',
    'deadline-exceeded': 'Liste işlemi zaman aşımına uğradı. Lütfen tekrar deneyin.',
    'not-found': 'Liste bulunamadı.'
  }
  return createListError(messages[code] || 'Liste işlemi tamamlanamadı. Lütfen tekrar deneyin.', error?.code)
}

function mapSharedListError(error) {
  const mapped = mapListError(error)
  if (String(error?.code || '').includes('permission-denied')) {
    return createListError('Ortak liste üyeliklerin okunamadı.', error.code)
  }
  if (String(error?.code || '').includes('failed-precondition')) {
    return createListError('Ortak liste sorgusu için gerekli Firestore indeksi hazır değil.', error.code)
  }
  return createListError('Ortak listeler yüklenirken bir sorun oluştu.', error?.code || mapped.code)
}

function logCollaborativeListError(stage, error, context = {}) {
  if (!import.meta.env.DEV) return
  console.error(`[collaborative-lists:${stage}]`, {
    code: error?.code || 'unknown',
    message: error?.message || 'Bilinmeyen hata',
    ...context
  })
}

function validateList({ title, description = '' }) {
  const cleanTitle = String(title || '').trim()
  const cleanDescription = String(description || '').trim()
  const titleLength = Array.from(cleanTitle).length
  if (titleLength < 3 || titleLength > 60) throw createListError('Liste adı 3–60 karakter arasında olmalı.', 'lists/invalid-title')
  if (Array.from(cleanDescription).length > 300) throw createListError('Açıklama en fazla 300 karakter olabilir.', 'lists/invalid-description')
  return { title: cleanTitle, description: cleanDescription }
}

function timestampValue(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (typeof value?.seconds === 'number') return value.seconds * 1000
  return 0
}

function newestFirst(items, field = 'createdAt') {
  return [...items].sort((a, b) => timestampValue(b[field]) - timestampValue(a[field]))
}

export function getMediaKey(mediaType, mediaId) {
  if (!['movie', 'tv'].includes(mediaType)) throw createListError('Geçersiz medya türü.', 'lists/invalid-media')
  return `${mediaType}_${String(mediaId)}`
}

export async function createList({ ownerUid, title, description = '', isPublic = true }) {
  if (!ownerUid) throw createListError('Liste oluşturmak için giriş yapmalısınız.', 'lists/unauthenticated')
  const values = validateList({ title, description })
  const reference = doc(collection(db, 'lists'))
  try {
    await setDoc(reference, {
      ownerUid,
      ...values,
      isPublic: Boolean(isPublic),
      itemCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    if (isPublic) {
      try { const { createActivity } = await import('./activities'); await createActivity({ uid: ownerUid, type: 'list', targetType: 'list', targetId: reference.id }) }
      catch (activityError) { console.warn('Liste oluşturuldu ancak aktivite akışında paylaşılamadı.', activityError) }
    }
    return reference.id
  } catch (error) {
    throw mapListError(error)
  }
}

export async function updateList(listId, values) {
  const prepared = validateList(values)
  try {
    const before = await getDoc(doc(db, 'lists', listId))
    await updateDoc(doc(db, 'lists', listId), {
      ...prepared,
      isPublic: Boolean(values.isPublic),
      updatedAt: serverTimestamp()
    })
    if (before.exists() && before.data().isPublic !== Boolean(values.isPublic)) {
      try {
        const activities = await import('./activities')
        if (values.isPublic) await activities.createActivity({ uid: before.data().ownerUid, type: 'list', targetType: 'list', targetId: listId })
        else await activities.deleteActivity(before.data().ownerUid, 'list', listId)
      } catch (activityError) { console.warn('Liste güncellendi ancak aktivite görünürlüğü eşitlenemedi.', activityError) }
    }
  } catch (error) {
    throw mapListError(error)
  }
}

function logListDeleteError(stage, error) {
  if (!import.meta.env.DEV) return
  console.error('[lists:delete]', {
    stage,
    code: error?.code || 'unknown'
  })
}

async function deleteListItemAsOwner(listRef, itemRef, ownerUid) {
  return runTransaction(db, async (transaction) => {
    const listSnapshot = await transaction.get(listRef)
    const itemSnapshot = await transaction.get(itemRef)

    if (!listSnapshot.exists()) throw createListError('Liste bulunamadı.', 'lists/not-found')
    if (listSnapshot.data().ownerUid !== ownerUid) {
      throw createListError('Bu listeyi yalnızca sahibi silebilir.', 'lists/permission-denied')
    }
    if (!itemSnapshot.exists()) return false
    if (itemSnapshot.data().ownerUid !== ownerUid) {
      throw createListError('Liste öğesinin sahiplik bilgisi geçersiz.', 'lists/invalid-item-owner')
    }

    const itemCount = Number(listSnapshot.data().itemCount)
    if (!Number.isInteger(itemCount) || itemCount < 1) {
      throw createListError('Liste öğeleri ile yapım sayısı eşleşmiyor.', 'lists/invalid-item-count')
    }

    transaction.delete(itemRef)
    transaction.update(listRef, {
      itemCount: itemCount - 1,
      updatedAt: serverTimestamp()
    })
    return true
  })
}

export async function deleteList(listId, actorUid) {
  const listRef = doc(db, 'lists', listId)
  const authUid = getFirebaseAuth().currentUser?.uid
  if (!actorUid || !authUid) {
    throw createListError('Listeyi silmek için giriş yapmalısınız.', 'lists/unauthenticated')
  }
  if (authUid !== actorUid) {
    throw createListError('Aktif oturum bu liste silme isteğiyle eşleşmiyor.', 'lists/permission-denied')
  }

  let stage = 'listeyi doğrulama'
  try {
    const listSnapshot = await getDoc(listRef)
    if (!listSnapshot.exists()) throw createListError('Liste bulunamadı.', 'lists/not-found')
    if (listSnapshot.data().ownerUid !== actorUid) {
      throw createListError('Bu listeyi yalnızca sahibi silebilir.', 'lists/permission-denied')
    }

    // Ortakları önce kaldırmak, silme sırasında başka bir editörün yeni öğe
    // eklemesini engeller. Liste sahibi bu belgeleri mevcut kurallarla silebilir.
    stage = 'ortakları temizleme'
    const members = await getDocs(collection(listRef, 'members'))
    for (let offset = 0; offset < members.docs.length; offset += 400) {
      const batch = writeBatch(db)
      members.docs.slice(offset, offset + 400).forEach((item) => batch.delete(item.ref))
      await batch.commit()
    }

    // Rules, her item silimini itemCount değerini aynı transaction içinde bir
    // azaltan ana liste güncellemesiyle birlikte zorunlu tutuyor.
    stage = 'liste öğelerini temizleme'
    while (true) {
      const items = await getDocs(query(collection(listRef, 'items'), limit(100)))
      if (items.empty) break
      for (const item of items.docs) {
        await deleteListItemAsOwner(listRef, item.ref, actorUid)
      }
    }

    // Aktiviteyi liste belgesinden önce kaldırarak akışta yetim veri kalmasını önle.
    stage = 'liste aktivitesini temizleme'
    try {
      const { tryDeleteListActivity } = await import('./activities')
      await tryDeleteListActivity(actorUid, listId)
    } catch (error) {
      // Aktivite yardımcı katmanındaki beklenmeyen bir hata da owner'ın kendi
      // listesini silmesini engellememeli.
      logListDeleteError(stage, error)
    }

    stage = 'liste belgesini silme'
    await deleteDoc(listRef)
    return true
  } catch (error) {
    logListDeleteError(stage, error)
    if (String(error?.code || '').startsWith('lists/')) throw error
    throw mapListError(error)
  }
}

function subscribeToLists(source, onChange, onError) {
  return onSnapshot(source, (snapshot) => {
    onChange(newestFirst(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))))
  }, (error) => onError?.(mapListError(error)))
}

export function subscribeToUserLists(uid, onChange, onError) {
  if (!uid) { onChange([]); return () => {} }
  return subscribeToLists(query(collection(db, 'lists'), where('ownerUid', '==', uid)), onChange, onError)
}

export function subscribeToPublicLists(onChange, onError) {
  return subscribeToLists(query(collection(db, 'lists'), where('isPublic', '==', true)), onChange, onError)
}

export function subscribeToList(listId, onChange, onError) {
  return onSnapshot(doc(db, 'lists', listId), (snapshot) => {
    onChange(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null)
  }, (error) => onError?.(mapListError(error)))
}

export function subscribeToListItems(listId, onChange, onError) {
  return onSnapshot(collection(db, 'lists', listId, 'items'), (snapshot) => {
    onChange(newestFirst(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })), 'addedAt'))
  }, (error) => onError?.(mapListError(error)))
}

function assertRole(role) {
  if (!['editor', 'viewer'].includes(role)) throw createListError('Geçersiz ortak rolü.', 'lists/invalid-role')
}

async function assertListOwner(listId, actorUid) {
  if (!actorUid) throw createListError('Bu işlem için giriş yapmalısınız.', 'lists/unauthenticated')
  const snapshot = await getDoc(doc(db, 'lists', listId))
  if (!snapshot.exists()) throw createListError('Liste bulunamadı.', 'lists/not-found')
  if (snapshot.data().ownerUid !== actorUid) throw createListError('Ortakları yalnızca liste sahibi yönetebilir.', 'lists/permission-denied')
  return snapshot.data()
}

export function subscribeToListMembers(listId, onChange, onError) {
  if (!listId) { onChange([]); return () => {} }
  return onSnapshot(collection(db, 'lists', listId, 'members'), (snapshot) => {
    onChange(newestFirst(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))))
  }, (error) => onError?.(mapListError(error)))
}

export async function addListMember(listId, actorUid, uid, role) {
  assertRole(role)
  if (!uid || uid === actorUid) throw createListError('Liste sahibi ortak olarak eklenemez.', 'lists/invalid-member')
  await assertListOwner(listId, actorUid)
  try {
    const reference = doc(db, 'lists', listId, 'members', uid)
    const snapshot = await getDoc(reference)
    if (snapshot.exists()) throw createListError('Bu kullanıcı zaten ortak.', 'lists/member-exists')
    await setDoc(reference, { uid, role, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    try { const { createNotification } = await import('./notifications'); await createNotification({ recipientUid: uid, type: 'list_member', targetType: 'list', targetId: listId }) }
    catch (notificationError) { if (import.meta.env.DEV) console.error('[notification:list-member-create]', notificationError) }
  } catch (error) { throw mapListError(error) }
}

export async function updateListMemberRole(listId, actorUid, uid, role) {
  assertRole(role)
  await assertListOwner(listId, actorUid)
  try { await updateDoc(doc(db, 'lists', listId, 'members', uid), { role, updatedAt: serverTimestamp() }) }
  catch (error) { throw mapListError(error) }
}

export async function removeListMember(listId, actorUid, uid) {
  await assertListOwner(listId, actorUid)
  try { await deleteDoc(doc(db, 'lists', listId, 'members', uid)); try { const { removeNotification } = await import('./notifications'); await removeNotification({ recipientUid: uid, type: 'list_member', targetId: listId, actorUid }) } catch (notificationError) { if (import.meta.env.DEV) console.error('[notification:list-member-delete]', notificationError) } }
  catch (error) { throw mapListError(error) }
}

export async function leaveSharedList(listId, uid) {
  if (!uid) throw createListError('Listeden ayrılmak için giriş yapmalısınız.', 'lists/unauthenticated')
  try {
    const [listSnapshot, memberSnapshot] = await Promise.all([
      getDoc(doc(db, 'lists', listId)),
      getDoc(doc(db, 'lists', listId, 'members', uid))
    ])
    if (!listSnapshot.exists()) throw createListError('Liste bulunamadı.', 'lists/not-found')
    if (listSnapshot.data().ownerUid === uid) throw createListError('Liste sahibi kendi listesinden ayrılamaz.', 'lists/owner-cannot-leave')
    if (!memberSnapshot.exists() || memberSnapshot.data().uid !== uid) throw createListError('Bu listenin ortağı değilsiniz.', 'lists/not-member')
    await deleteDoc(memberSnapshot.ref)
  } catch (error) { throw mapListError(error) }
}

export async function getListRole(listId, uid) {
  if (!uid) return null
  try {
    const [listSnapshot, memberSnapshot] = await Promise.all([
      getDoc(doc(db, 'lists', listId)),
      getDoc(doc(db, 'lists', listId, 'members', uid))
    ])
    if (!listSnapshot.exists()) return null
    if (listSnapshot.data().ownerUid === uid) return 'owner'
    return memberSnapshot.exists() ? memberSnapshot.data().role : null
  } catch (error) { throw mapListError(error) }
}

export function subscribeToSharedLists(uid, onChange, onError) {
  if (!uid) { onChange([]); return () => {} }
  const listStops = new Map()
  const lists = new Map()
  const roles = new Map()
  const resolved = new Set()
  const listErrors = new Map()
  const emit = () => onChange(newestFirst([...lists.entries()].map(([id, data]) => ({ id, ...data, currentRole: roles.get(id) }))))
  const membershipQuery = query(
    collectionGroup(db, 'members'),
    where('uid', '==', uid),
    limit(100)
  )
  const stopMemberships = onSnapshot(membershipQuery, (snapshot) => {
    const memberships = snapshot.docs.flatMap((membershipDoc) => {
      const membershipData = membershipDoc.data()
      const listRef = membershipDoc.ref.parent.parent
      const memberPath = membershipDoc.ref.path
      if (listRef?.parent?.id !== 'lists') return []
      if (!listRef.id || membershipData.uid !== uid || !['editor', 'viewer'].includes(membershipData.role)) {
        logCollaborativeListError('member-validate', createListError('Geçersiz üyelik belgesi.', 'lists/invalid-membership'), { memberPath, listPath: listRef?.path || '' })
        return []
      }
      return [{ membershipData, membershipDoc, listRef, listId: listRef.id, memberPath }]
    })
    const activeIds = new Set(memberships.map((membership) => membership.listId))
    for (const [listId, stop] of listStops) if (!activeIds.has(listId)) { stop(); listStops.delete(listId); lists.delete(listId); roles.delete(listId); resolved.delete(listId); listErrors.delete(listId) }
    if (!memberships.length) { emit(); return }
    const finish = () => {
      if (![...activeIds].every((listId) => resolved.has(listId))) return
      emit()
      if (!lists.size && listErrors.size) onError?.([...listErrors.values()][0])
    }
    memberships.forEach(({ membershipData, listRef, listId, memberPath }) => {
      roles.set(listId, membershipData.role)
      if (listStops.has(listId)) return
      listStops.set(listId, onSnapshot(listRef, (listSnapshot) => {
        resolved.add(listId); listErrors.delete(listId)
        if (listSnapshot.exists()) lists.set(listId, listSnapshot.data())
        else {
          lists.delete(listId)
          if (import.meta.env.DEV) console.warn('[collaborative-lists:orphan-membership]', { memberPath, listPath: listRef.path })
        }
        finish()
      }, (error) => {
        resolved.add(listId); lists.delete(listId)
        logCollaborativeListError('list-load', error, { memberPath, listPath: listRef.path })
        const mapped = String(error?.code || '').includes('permission-denied')
          ? createListError('Bu ortak listeyi görüntüleme yetkin yok.', error.code)
          : createListError('Ortak liste belgesi yüklenemedi.', error?.code || 'lists/shared-list-read-failed')
        listErrors.set(listId, mapped)
        finish()
      }))
    })
    finish()
  }, (error) => {
    logCollaborativeListError('membership-query', error)
    onError?.(mapSharedListError(error))
  })
  return () => { stopMemberships(); listStops.forEach((stop) => stop()); listStops.clear() }
}

export async function getListItem(listId, mediaType, mediaId) {
  try {
    const snapshot = await getDoc(doc(db, 'lists', listId, 'items', getMediaKey(mediaType, mediaId)))
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
  } catch (error) {
    throw mapListError(error)
  }
}

export async function addItemToList(listId, actorUid, media) {
  const mediaKey = getMediaKey(media.mediaType, media.mediaId)
  const listRef = doc(db, 'lists', listId)
  const itemRef = doc(listRef, 'items', mediaKey)
  const memberRef = doc(listRef, 'members', actorUid)
  try {
    return await runTransaction(db, async (transaction) => {
      const listSnapshot = await transaction.get(listRef)
      const itemSnapshot = await transaction.get(itemRef)
      const memberSnapshot = await transaction.get(memberRef)
      if (!listSnapshot.exists()) throw createListError('Liste bulunamadı.', 'lists/not-found')
      if (listSnapshot.data().ownerUid !== actorUid) {
        if (memberSnapshot.data()?.role !== 'editor') throw createListError('Bu listeye yapım ekleme yetkiniz yok.', 'lists/permission-denied')
      }
      if (itemSnapshot.exists()) return false
      transaction.set(itemRef, {
        ownerUid: listSnapshot.data().ownerUid,
        mediaKey,
        mediaId: String(media.mediaId),
        mediaType: media.mediaType,
        title: String(media.title || ''),
        posterPath: String(media.posterPath || ''),
        releaseDate: String(media.releaseDate || ''),
        addedAt: serverTimestamp()
      })
      transaction.update(listRef, { itemCount: Number(listSnapshot.data().itemCount || 0) + 1, updatedAt: serverTimestamp() })
      return true
    })
  } catch (error) {
    if (String(error?.code || '').startsWith('lists/')) throw error
    const mapped = mapListError(error)
    throw createListError(`Yapım listeye eklenemedi; item ve sayaç değişiklikleri uygulanmadı. ${mapped.message}`, error?.code || 'lists/add-item-failed')
  }
}

export async function removeItemFromList(listId, actorUid, mediaType, mediaId) {
  const listRef = doc(db, 'lists', listId)
  const itemRef = doc(listRef, 'items', getMediaKey(mediaType, mediaId))
  const memberRef = doc(listRef, 'members', actorUid)
  try {
    return await runTransaction(db, async (transaction) => {
      const listSnapshot = await transaction.get(listRef)
      const itemSnapshot = await transaction.get(itemRef)
      const memberSnapshot = await transaction.get(memberRef)
      if (!listSnapshot.exists()) throw createListError('Liste bulunamadı.', 'lists/not-found')
      if (listSnapshot.data().ownerUid !== actorUid && memberSnapshot.data()?.role !== 'editor') throw createListError('Bu listeden yapım çıkarma yetkiniz yok.', 'lists/permission-denied')
      if (!itemSnapshot.exists()) return false
      transaction.delete(itemRef)
      transaction.update(listRef, { itemCount: Math.max(0, Number(listSnapshot.data().itemCount || 0) - 1), updatedAt: serverTimestamp() })
      return true
    })
  } catch (error) {
    if (String(error?.code || '').startsWith('lists/')) throw error
    const mapped = mapListError(error)
    throw createListError(`Yapım listeden çıkarılamadı; item ve sayaç değişiklikleri uygulanmadı. ${mapped.message}`, error?.code || 'lists/remove-item-failed')
  }
}

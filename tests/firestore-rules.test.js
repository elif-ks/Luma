import { after, before, beforeEach, describe, test } from 'node:test'
import { readFile } from 'node:fs/promises'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  Timestamp,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore'

const PROJECT_ID = 'demo-luma-rules'
const EMULATOR_HOST = '127.0.0.1'
const EMULATOR_PORT = 8080
const FIXED_TIME = Timestamp.fromMillis(1_700_000_000_000)

let testEnv

function assertEmulatorOnly() {
  const configuredHost = process.env.FIRESTORE_EMULATOR_HOST
  if (!configuredHost || !['127.0.0.1:8080', 'localhost:8080'].includes(configuredHost)) {
    throw new Error('Güvenlik nedeniyle testler yalnızca yerel Firestore Emulator üzerinde çalıştırılabilir.')
  }
  if (process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT !== PROJECT_ID) {
    throw new Error(`Beklenmeyen proje kimliği: ${process.env.GCLOUD_PROJECT}`)
  }
}

function dbFor(uid) {
  return testEnv.authenticatedContext(uid).firestore()
}

function anonymousDb() {
  return testEnv.unauthenticatedContext().firestore()
}

async function seed(entries) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    for (const [path, data] of entries) {
      await setDoc(doc(db, path), data)
    }
  })
}

const profile = (uid, username = uid) => ({
  uid,
  username,
  usernameLower: username.toLowerCase(),
  bio: '',
  photoURL: '',
  createdAt: FIXED_TIME,
  updatedAt: FIXED_TIME,
})

const activity = (uid, visibility = 'public') => ({
  uid,
  type: 'review',
  targetType: 'review',
  targetId: 'review-1',
  mediaKey: 'movie_1',
  visibility,
  createdAt: FIXED_TIME,
})

const conversation = () => ({
  participants: ['alice', 'bob'],
  createdBy: 'alice',
  createdAt: FIXED_TIME,
  updatedAt: FIXED_TIME,
})

const message = (senderUid = 'alice') => ({
  senderUid,
  content: 'Merhaba',
  mediaUrl: '',
  createdAt: FIXED_TIME,
  updatedAt: FIXED_TIME,
})

const community = (overrides = {}) => ({
  ownerUid: 'owner',
  name: 'Luma Kulübü',
  nameLower: 'luma kulübü',
  description: 'Filmler üzerine güvenli bir topluluk.',
  rules: '',
  category: 'general',
  theme: 'sunset',
  isPublic: true,
  isArchived: false,
  memberCount: 3,
  postCount: 0,
  createdAt: FIXED_TIME,
  updatedAt: FIXED_TIME,
  ...overrides,
})

const member = (uid, role = 'member') => ({
  uid,
  role,
  createdAt: FIXED_TIME,
  updatedAt: FIXED_TIME,
})

const communityPost = (ownerUid = 'member') => ({
  communityId: 'community-1',
  ownerUid,
  type: 'discussion',
  content: 'Bu filmi birlikte konuşalım.',
  spoiler: false,
  mediaKey: null,
  mediaType: null,
  mediaId: null,
  mediaTitle: null,
  posterPath: null,
  pollId: null,
  likeCount: 0,
  replyCount: 0,
  lastReplyId: null,
  isPinned: false,
  createdAt: FIXED_TIME,
  updatedAt: FIXED_TIME,
})

const poll = () => ({
  communityId: 'community-1',
  postId: 'poll-post',
  ownerUid: 'owner',
  question: 'En iyi seçenek hangisi?',
  options: ['Bir', 'İki', 'Üç'],
  optionCounts: [0, 0, 0],
  totalVotes: 0,
  closesAt: null,
  createdAt: FIXED_TIME,
  updatedAt: FIXED_TIME,
})

before(async () => {
  assertEmulatorOnly()
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: EMULATOR_HOST,
      port: EMULATOR_PORT,
      rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  })
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

after(async () => {
  await testEnv?.cleanup()
})

describe('Kullanıcı ve profil güvenliği', () => {
  test('public profil oturumsuz okunabilir', async () => {
    await seed([['users/alice', profile('alice')]])
    await assertSucceeds(getDoc(doc(anonymousDb(), 'users/alice')))
  })

  test('başka kullanıcının profili değiştirilemez', async () => {
    await seed([['users/alice', profile('alice')], ['usernames/alice', { uid: 'alice', createdAt: FIXED_TIME }]])
    await assertFails(updateDoc(doc(dbFor('mallory'), 'users/alice'), { bio: 'değiştirildi', updatedAt: serverTimestamp() }))
  })

  test('sahip izin verilen profil alanını değiştirebilir', async () => {
    await seed([['users/alice', profile('alice')], ['usernames/alice', { uid: 'alice', createdAt: FIXED_TIME }]])
    await assertSucceeds(updateDoc(doc(dbFor('alice'), 'users/alice'), { bio: 'Yeni biyografi', updatedAt: serverTimestamp() }))
  })

  test('profilde kurallarda olmayan alan reddedilir', async () => {
    await seed([['users/alice', profile('alice')], ['usernames/alice', { uid: 'alice', createdAt: FIXED_TIME }]])
    await assertFails(updateDoc(doc(dbFor('alice'), 'users/alice'), { email: 'eklenemez', updatedAt: serverTimestamp() }))
  })

  test('private settings başka kullanıcı tarafından okunamaz', async () => {
    await seed([['users/alice/private/settings', { accountPrivacy: 'public' }]])
    await assertFails(getDoc(doc(dbFor('bob'), 'users/alice/private/settings')))
  })
})

describe('Aktiviteler', () => {
  test('public aktivite oturumsuz okunabilir', async () => {
    await seed([['activities/a1', activity('alice')]])
    await assertSucceeds(getDoc(doc(anonymousDb(), 'activities/a1')))
  })

  test('private aktiviteyi başka kullanıcı okuyamaz ama sahibi okuyabilir', async () => {
    await seed([['activities/a1', activity('alice', 'private')]])
    await assertFails(getDoc(doc(dbFor('bob'), 'activities/a1')))
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'activities/a1')))
  })

  test('kullanıcı yalnızca kendi uid değeriyle aktivite oluşturabilir', async () => {
    const own = { ...activity('alice'), createdAt: serverTimestamp() }
    const forged = { ...own, uid: 'bob' }
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'activities/a1'), own))
    await assertFails(setDoc(doc(dbFor('alice'), 'activities/a2'), forged))
  })

  test('izin verilmeyen activity alanı reddedilir', async () => {
    await assertFails(setDoc(doc(dbFor('alice'), 'activities/a1'), {
      ...activity('alice'), createdAt: serverTimestamp(), email: 'eklenemez',
    }))
  })

  test('aktivite güncellenemez ve yalnızca sahibi silebilir', async () => {
    await seed([['activities/a1', activity('alice')], ['activities/a2', activity('alice')]])
    await assertFails(updateDoc(doc(dbFor('alice'), 'activities/a1'), { visibility: 'private' }))
    await assertFails(deleteDoc(doc(dbFor('bob'), 'activities/a1')))
    await assertSucceeds(deleteDoc(doc(dbFor('alice'), 'activities/a2')))
  })
})

describe('Takip, block ve mute', () => {
  test('kullanıcı kendisini takip edemez', async () => {
    await assertFails(setDoc(doc(dbFor('alice'), 'follows/alice_alice'), {
      followerUid: 'alice', followingUid: 'alice', createdAt: serverTimestamp(),
    }))
  })

  test('başka kullanıcı adına follow oluşturulamaz', async () => {
    await assertFails(setDoc(doc(dbFor('mallory'), 'follows/alice_bob'), {
      followerUid: 'alice', followingUid: 'bob', createdAt: serverTimestamp(),
    }))
  })

  test('geçerli follow sahibi tarafından oluşturulabilir', async () => {
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'follows/alice_bob'), {
      followerUid: 'alice', followingUid: 'bob', createdAt: serverTimestamp(),
    }))
  })

  test('block ve mute yalnızca sahibi tarafından oluşturulabilir', async () => {
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'users/alice/blocks/bob'), { targetUid: 'bob', createdAt: serverTimestamp() }))
    await assertSucceeds(setDoc(doc(dbFor('alice'), 'users/alice/mutes/bob'), { targetUid: 'bob', createdAt: serverTimestamp() }))
    await assertFails(setDoc(doc(dbFor('mallory'), 'users/alice/mutes/carol'), { targetUid: 'carol', createdAt: serverTimestamp() }))
  })

  test('üçüncü kişi başka kullanıcının block ve mute kayıtlarını okuyamaz', async () => {
    await seed([
      ['users/alice/blocks/bob', { targetUid: 'bob', createdAt: FIXED_TIME }],
      ['users/alice/mutes/bob', { targetUid: 'bob', createdAt: FIXED_TIME }],
    ])
    await assertFails(getDoc(doc(dbFor('mallory'), 'users/alice/blocks/bob')))
    await assertFails(getDoc(doc(dbFor('mallory'), 'users/alice/mutes/bob')))
  })
})

describe('Mesajlar', () => {
  test('yalnızca katılımcılar konuşmayı ve mesajı okuyabilir', async () => {
    await seed([['conversations/c1', conversation()], ['conversations/c1/messages/m1', message()]])
    await assertSucceeds(getDoc(doc(dbFor('alice'), 'conversations/c1')))
    await assertSucceeds(getDoc(doc(dbFor('bob'), 'conversations/c1/messages/m1')))
    await assertFails(getDoc(doc(dbFor('mallory'), 'conversations/c1')))
    await assertFails(getDoc(doc(dbFor('mallory'), 'conversations/c1/messages/m1')))
  })

  test('katılımcı mesajı ve conversation özetini atomik yazabilir', async () => {
    await seed([['conversations/c1', conversation()]])
    const db = dbFor('alice')
    const batch = writeBatch(db)
    batch.update(doc(db, 'conversations/c1'), {
      updatedAt: serverTimestamp(), lastMessageId: 'm1', lastSenderUid: 'alice', lastMessageAt: serverTimestamp(),
    })
    batch.set(doc(db, 'conversations/c1/messages/m1'), {
      senderUid: 'alice', content: 'Merhaba', mediaUrl: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    await assertSucceeds(batch.commit())
  })

  test('katılımcı olmayan kullanıcı mesaj yazamaz', async () => {
    await seed([['conversations/c1', conversation()]])
    await assertFails(setDoc(doc(dbFor('mallory'), 'conversations/c1/messages/m1'), {
      senderUid: 'mallory', content: 'Yetkisiz', mediaUrl: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }))
  })

  test('sahte senderUid ve ek mesaj alanı reddedilir', async () => {
    await seed([['conversations/c1', conversation()]])
    for (const payload of [
      { senderUid: 'bob', content: 'Sahte', mediaUrl: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
      { senderUid: 'alice', content: 'Ek alan', mediaUrl: '', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), email: 'eklenemez' },
    ]) {
      await assertFails(setDoc(doc(dbFor('alice'), `conversations/c1/messages/${payload.senderUid}-${payload.content}`), payload))
    }
  })
})

describe('Topluluklar ve roller', () => {
  test('public topluluk okunabilir, private topluluk yetkisiz kullanıcıya kapalıdır', async () => {
    await seed([
      ['communities/public', community()],
      ['communities/private', community({ isPublic: false })],
    ])
    await assertSucceeds(getDoc(doc(anonymousDb(), 'communities/public')))
    await assertFails(getDoc(doc(dbFor('mallory'), 'communities/private')))
  })

  test('yetkisiz kullanıcı topluluğu düzenleyemez', async () => {
    await seed([['communities/community-1', community()]])
    await assertFails(updateDoc(doc(dbFor('member'), 'communities/community-1'), { description: 'Yetkisiz değişiklik', updatedAt: serverTimestamp() }))
  })

  test('başka kullanıcı adına üyelik yazılamaz', async () => {
    await seed([['communities/community-1', community()]])
    await assertFails(setDoc(doc(dbFor('mallory'), 'communities/community-1/members/member'), {
      uid: 'member', role: 'member', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }))
  })

  test('aktif topluluk üyesi gönderiyi sayaçla atomik oluşturabilir', async () => {
    await seed([
      ['communities/community-1', community()],
      ['communities/community-1/members/member', member('member')],
    ])
    const db = dbFor('member')
    const batch = writeBatch(db)
    batch.update(doc(db, 'communities/community-1'), { postCount: 1, updatedAt: serverTimestamp() })
    batch.set(doc(db, 'communities/community-1/posts/post-1'), {
      ...communityPost(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    await assertSucceeds(batch.commit())
  })

  test('üye olmayan kullanıcı community gönderisi oluşturamaz', async () => {
    await seed([['communities/community-1', community()]])
    await assertFails(setDoc(doc(dbFor('mallory'), 'communities/community-1/posts/post-1'), {
      ...communityPost('mallory'), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }))
  })

  test('moderator gönderiyi sabitleyebilir, normal üye başkasının gönderisini düzenleyemez', async () => {
    await seed([
      ['communities/community-1', community()],
      ['communities/community-1/members/mod', member('mod', 'moderator')],
      ['communities/community-1/members/member', member('member')],
      ['communities/community-1/posts/post-1', communityPost('owner')],
    ])
    await assertSucceeds(updateDoc(doc(dbFor('mod'), 'communities/community-1/posts/post-1'), { isPinned: true, updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(dbFor('member'), 'communities/community-1/posts/post-1'), { content: 'Yetkisiz', updatedAt: serverTimestamp() }))
  })
})

describe('Topluluk anketleri', () => {
  async function seedPoll(voteEntries = []) {
    await seed([
      ['communities/community-1', community()],
      ['communities/community-1/members/voter', member('voter')],
      ['communities/community-1/polls/poll-1', poll()],
      ...voteEntries,
    ])
  }

  function voteBatch(db, optionCounts, totalVotes, optionIndex = 1) {
    const batch = writeBatch(db)
    batch.update(doc(db, 'communities/community-1/polls/poll-1'), {
      optionCounts, totalVotes, updatedAt: serverTimestamp(),
    })
    batch.set(doc(db, 'communities/community-1/polls/poll-1/votes/voter'), {
      uid: 'voter', optionIndex, createdAt: serverTimestamp(),
    })
    return batch
  }

  test('oy Auth UID ile eşleşip yalnızca seçilen sayacı ve totalVotes değerini +1 artırır', async () => {
    await seedPoll()
    await assertSucceeds(voteBatch(dbFor('voter'), [0, 1, 0], 1).commit())
  })

  test('başka UID adına oy yazılamaz', async () => {
    await seedPoll()
    const db = dbFor('voter')
    const batch = writeBatch(db)
    batch.update(doc(db, 'communities/community-1/polls/poll-1'), { optionCounts: [1, 0, 0], totalVotes: 1, updatedAt: serverTimestamp() })
    batch.set(doc(db, 'communities/community-1/polls/poll-1/votes/other'), { uid: 'other', optionIndex: 0, createdAt: serverTimestamp() })
    await assertFails(batch.commit())
  })

  test('aynı kullanıcının ikinci oyu reddedilir', async () => {
    await seedPoll([['communities/community-1/polls/poll-1/votes/voter', { uid: 'voter', optionIndex: 1, createdAt: FIXED_TIME }]])
    await assertFails(voteBatch(dbFor('voter'), [0, 1, 0], 1).commit())
  })

  test('yanlış sayaç, toplu sayaç ve azaltma girişimleri reddedilir', async () => {
    for (const [counts, total] of [[[1, 1, 0], 1], [[0, 1, 0], 2], [[0, 0, 0], -1]]) {
      await testEnv.clearFirestore()
      await seedPoll()
      await assertFails(voteBatch(dbFor('voter'), counts, total).commit())
    }
  })
})

describe('Şikâyetler', () => {
  const reportPayload = (overrides = {}) => ({
    reporterUid: 'reporter',
    targetType: 'user',
    targetId: 'target',
    reason: 'spam',
    details: '',
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  })

  test('mevcut başka public kullanıcı raporlanabilir', async () => {
    await seed([['users/target', profile('target')]])
    await assertSucceeds(setDoc(doc(dbFor('reporter'), 'reports/reporter_user_target'), reportPayload()))
  })

  test('kullanıcı kendi içeriğini raporlayamaz', async () => {
    await seed([['users/reporter', profile('reporter')]])
    await assertFails(setDoc(doc(dbFor('reporter'), 'reports/reporter_user_reporter'), reportPayload({ targetId: 'reporter' })))
  })

  test('private veya bulunmayan hedef raporlanamaz', async () => {
    await seed([['posts/private-post', { ownerUid: 'target', visibility: 'private' }]])
    await assertFails(setDoc(doc(dbFor('reporter'), 'reports/reporter_post_private-post'), reportPayload({ targetType: 'post', targetId: 'private-post' })))
    await assertFails(setDoc(doc(dbFor('reporter'), 'reports/reporter_user_missing'), reportPayload({ targetId: 'missing' })))
  })

  test('deterministik duplicate report reddedilir', async () => {
    await seed([
      ['users/target', profile('target')],
      ['reports/reporter_user_target', { ...reportPayload(), createdAt: FIXED_TIME, updatedAt: FIXED_TIME }],
    ])
    await assertFails(setDoc(doc(dbFor('reporter'), 'reports/reporter_user_target'), reportPayload()))
  })

  test('başka kullanıcı adına reporterUid kullanılamaz', async () => {
    await seed([['users/target', profile('target')]])
    await assertFails(setDoc(doc(dbFor('mallory'), 'reports/reporter_user_target'), reportPayload()))
  })

  test('şikâyete kurallarda olmayan alan eklenemez', async () => {
    await seed([['users/target', profile('target')]])
    await assertFails(setDoc(doc(dbFor('reporter'), 'reports/reporter_user_target'), reportPayload({ email: 'eklenemez' })))
  })
})

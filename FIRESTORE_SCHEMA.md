# Luma Firestore veri şeması

Bu belge Luma'nın mevcut ve planlanan Firestore veri sözleşmesini tanımlar. Zaman alanları istemcide `serverTimestamp()` ile yazılır. Herkese açık belgelerde e-posta, telefon veya başka özel hesap bilgileri tutulmaz. Tanımlanmayan bütün yollar `firestore.rules` tarafından reddedilir.

## Ortak kurallar

- UID içeren sahiplik alanları oluşturulurken Firebase Authentication UID'siyle eşleşir ve sonradan değiştirilemez.
- Belge kimliğinde UID kullanılan yapılarda kimlik ile belge alanı birlikte doğrulanır.
- Web istemcisi güvenilir sayaç, moderasyon veya bildirim üretemez.
- `createdAt` oluşturulduktan sonra değişmez; güncellenebilen belgelerde `updatedAt` sunucu zamanıyla yenilenir.
- Görünürlük değerleri bağlama göre `public`, `private` ve gerektiğinde `followers` değerleridir. Takipçi görünürlüğünün akış sorguları geliştirilirken ilişki katmanıyla birlikte ele alınması gerekir.

## Mevcut yapılar

### `users/{uid}`

Alanlar: `uid`, `username`, `usernameLower`, `bio`, `photoURL`, `createdAt`, `updatedAt`.

Profil herkese okunabilir. Yalnızca hesap sahibi oluşturup güncelleyebilir. E-posta bu belgeye yazılmaz. Kullanıcı adı rezervasyonu `usernames/{usernameLower}` ile atomik eşleşir.

### `usernames/{usernameLower}`

Alanlar: `uid`, `createdAt`. Belge kimliği normalize edilmiş kullanıcı adıdır. Müsaitlik kontrolü için okunabilir; yalnızca ilgili Auth kullanıcısı kendi profil transaction'ı kapsamında oluşturabilir veya eski rezervasyonunu kaldırabilir.

### `users/{uid}/library/{mediaType}_{mediaId}`

Alanlar: `uid`, `mediaId`, `mediaType`, `title`, `posterPath`, `releaseDate`, `favorite`, `watched`, `watchlist`, ilgili durum tarihleri, `createdAt`, `updatedAt`. Okuma açık, yazma yalnızca hesap sahibine aittir. `mediaType`, `movie` veya `tv` olabilir.

### `reviews/{uid}*{mediaType}*{mediaId}`

Alanlar: `uid`, `mediaKey`, medya bilgileri, `rating`, `content`, `spoiler`, `createdAt`, `updatedAt`. Yorumlar herkese okunabilir. Puan 1–5 tam sayı, içerik 10–2000 karakterdir. Yalnızca sahibi yazabilir ve kimlik alanları güncellemede değişmez.

### `lists/{listId}` ve `lists/{listId}/items/{mediaType}_{mediaId}`

Liste alanları: `ownerUid`, `title`, `description`, `isPublic`, `itemCount`, `createdAt`, `updatedAt`. Öğe alanları: `ownerUid`, `mediaKey`, medya bilgileri ve `addedAt`. Herkese açık listeyi herkes; özel listeyi sahibi ve üyeleri okuyabilir. Sahip listeyi yönetir. Sahip veya `editor` üye öğe ekleyip çıkarabilir. `itemCount` negatif olamaz.

## Diary

### `users/{uid}/diary/{entryId}`

Alanlar: `uid`, `mediaKey`, `mediaId`, `mediaType`, `title`, `posterPath`, `releaseDate`, `watchedAt`, isteğe bağlı `rating`, `rewatch`, `note`, `tags`, `visibility`, `createdAt`, `updatedAt`. `public` kayıtları herkes, `private` kayıtları yalnızca sahibi okur. Yazma yalnızca sahibine aittir. Not en fazla 500 karakter, etiket sayısı en fazla 10'dur.

## Takip sistemi

### `follows/{followerUid}_{followingUid}`

Alanlar: `followerUid`, `followingUid`, `createdAt`. Sosyal profil ve sayımlar için okunabilir. Takip eden kullanıcı yalnızca kendi belgesini oluşturup silebilir; kendisini takip edemez. Güncelleme yoktur.

## Sosyal gönderiler

### `posts/{postId}`

Alanlar: `ownerUid`, `type`, `content`, `mediaKey`, `reviewId`, `listId`, `diaryEntryId`, `quotedPostId`, `poll`, `spoiler`, `visibility`, `createdAt`, `updatedAt`. Bağlantısız alanlar boş değerle tutulabilir. Türler `text`, `media`, `review`, `list`, `diary`, `quote`, `poll`; içerik en fazla 500 karakterdir. Herkese açık gönderiler okunabilir, özel gönderiyi yalnızca sahibi okuyabilir. Güncelleme ve silme sahibine aittir.

- `posts/{postId}/replies/{replyId}`: `ownerUid`, `content`, `spoiler`, `createdAt`, `updatedAt`. Okuma açık, yazma cevap sahibine aittir.
- `posts/{postId}/likes/{uid}`: `uid`, `createdAt`. Okuma açık; kullanıcı yalnızca kendi beğenisini oluşturup siler.
- `posts/{postId}/reposts/{uid}`: `uid`, `createdAt`. Okuma açık; kullanıcı yalnızca kendi repost kaydını oluşturup siler.
- `posts/{postId}/bookmarks/{uid}`: `uid`, `createdAt`. Yalnızca sahibi okuyup oluşturup silebilir.

## Review ve liste beğenileri

- `reviews/{reviewId}/likes/{uid}`
- `lists/{listId}/likes/{uid}`

Alanlar `uid`, `createdAt`. Kullanıcı yalnızca kendi UID belgelerini oluşturup silebilir. Review beğenileri sayım için açıktır; liste beğenileri listenin görünürlüğünü izler.

## Ortak listeler

### `lists/{listId}/members/{uid}`

Alanlar: `uid`, `role`, `createdAt`, `updatedAt`. Roller `editor` ve `viewer` değerleridir. Yalnızca liste sahibi üyeleri ve rolleri yönetir. Editor öğe ekleyip çıkarabilir; liste meta verisini, sahibini veya liste belgesini silemez. Viewer yalnızca erişebildiği listeyi okur. Editor ve viewer kendi UID member belgelerini silerek ortak listeden ayrılabilir; başka bir üyenin belgesini silemez.

## Kütüphane profil görünürlüğü

`users/{uid}/library/{mediaKey}` yalnızca hesap sahibi tarafından okunur ve yazılır. Favori, izlendi ve izleme listesi durumlarını birlikte taşıdığı için public profil tarafından sorgulanmaz.

`users/{uid}/publicSettings/library` alanları: `uid`, `showFavorites`, `showWatched`, `updatedAt`. Belge yoksa iki görünürlük de kapalı kabul edilir.

`users/{uid}/publicFavorites/{mediaKey}` ve `users/{uid}/publicWatched/{mediaKey}` yalnızca güvenli medya özetini taşır: `uid`, `mediaKey`, `mediaType`, `mediaId`, `title`, `posterPath`, `year`, `createdAt`, `updatedAt`. Public okuma ilgili görünürlük ayarına bağlıdır; watchlist, Diary, e-posta veya diğer private durumlar bu belgelere yazılmaz.

## Aktivite akışı

### `activities/{activityId}`

Alanlar: `uid`, `type`, `targetType`, `targetId`, `mediaKey`, `visibility`, `createdAt`. Türler `watched`, `favorite`, `review`, `list`, `post`. Kullanıcı yalnızca kendi adına kayıt oluşturup silebilir. Aktivite güncellenemez. `public` aktiviteler açık, diğerleri yalnızca sahibine görünür.

## Bildirimler

### `users/{uid}/notifications/{notificationId}`

Temel alanlar: `type`, `actorUid`, `targetType`, `targetId`, `read`, `readAt`, `createdAt`. Türler `follow`, `post_like`, `post_reply`, `repost`, `review_like`, `list_like`, `list_member`, `message` değerleridir. `post_reply` ve `message` türleri ayrıca zorunlu `sourceId` taşır; diğer türler bu alanı yazamaz. Mesaj bildiriminde `sourceId`, conversation belgesindeki en yeni `lastMessageId` değeridir. Serbest `message` alanı kullanılmaz; cevap metni, mesaj metni, gönderi metni ve profil bilgileri bildirim belgesine kopyalanmaz. Metin istemcide güvenli tür eşlemesinden üretilir. Yalnızca hedef kullanıcı okuyabilir, `read`/`readAt` alanlarını güncelleyebilir ve silebilir. Actor yalnızca doğrulanmış kaynak olayına bağlı kendi bildirimini oluşturabilir veya geri çekebilir.

Deterministik kimlikler: `follow_{actorUid}`, `postLike_{postId}_{actorUid}`, `postReply_{postId}_{replyId}`, `repost_{postId}_{actorUid}`, `reviewLike_{reviewId}_{actorUid}`, `listLike_{listId}_{actorUid}`, `listMember_{listId}`, `message_{conversationId}`. `post_reply` oluşturma kuralı parent gönderiyi ve cevabı doğrular. `message` bildirimi konuşma başına tek belgedir; yeni mesajla `sourceId`, zaman ve okunma alanları güvenli biçimde yenilenir. Actor ile recipient'ın iki kişilik conversation katılımcıları olduğu ve kaynak mesajın actor tarafından gönderildiği doğrulanır. Message notification belgesi yalnızca okunmamış konuşma state'i, Mesajlar rozeti ve konuşma listesi için kullanılır; genel Bildirimler sayfasında, genel bildirim rozetinde ve genel “Tümünü okundu” işleminde yer almaz. Okunmamış mesaj rozeti mesaj adedini değil, okunmamış `message` notification belgelerinden türetilen konuşma sayısını gösterir. Ayrı listener en fazla 100 message notification izler; her konuşma için listener açılmaz. Rol değişikliği bildirimleri hâlâ desteklenmez. İstemci mimarisi aynı olayı tekilleştirir ancak güvenilir hız sınırlama sağlayamaz.

## Engelleme ve sessize alma

- `users/{uid}/blocks/{targetUid}`
- `users/{uid}/mutes/{targetUid}`

Alanlar: `targetUid`, `createdAt`; belge kimliği hedef UID'dir ve tarih `serverTimestamp()` ile yazılır. Kullanıcı kendisini hedefleyemez. Hesap sahibi kendi block/mute listesini gerçek zamanlı okuyup yönetir. Mute kayıtları yalnızca sahibine görünür. Block kayıtlarında hedef kullanıcı yalnızca kendisini hedefleyen tekil kaydı ve `targetUid == Auth UID` collection-group sonucunu okuyabilir; böylece resmi istemci iki yönlü engeli merkezî olarak filtreler.

Engelleme, block belgesi ile mevcut iki yönlü `follows/{followerUid}_{followingUid}` belgelerinin silinmesini aynı batch içinde uygular. Engel kaldırıldığında takipler geri oluşturulmaz. İki yönlü block; yeni takip, sosyal gönderi cevabı/beğenisi/repost, review ve public liste beğenisi, ortak liste üyeliği, conversation ve mesaj yazımını Rules seviyesinde reddeder. Mevcut mesaj geçmişi silinmez. Sessize alma takip ilişkisini ve DM akışını değiştirmez; yalnızca sosyal akışları, aktiviteleri, genel bildirimleri ve önerileri resmi arayüzde gizler.

Public profil, gönderi, review ve diğer public koleksiyonların genel sorguları korunur. Bu nedenle değiştirilmiş bir istemci herkese açık belgeleri doğrudan okumaya devam edebilir; block bu veriler için mutlak okuma gizliliği değil, Rules seviyesinde yazma/etkileşim engeli ve resmi Luma arayüzünde merkezî görünürlük filtresi sağlar.

## Şikâyet sistemi

### `reports/{reportId}`

Alanlar: `reporterUid`, `targetType`, `targetId`, `reason`, `details`, `status`, `createdAt`, `updatedAt`.

Belge kimliği `{reporterUid}_{targetType}_{targetId}` biçiminde deterministiktir. Hedef türleri `user`, `post`, `review`, `list`; neden değerleri `spam`, `harassment`, `hate`, `sexual`, `violence`, `misinformation`, `privacy`, `spoiler`, `other` ile sınırlıdır. Oluşturma sırasında `status` yalnızca `pending` olabilir ve istemci daha sonra status dahil hiçbir alanı güncelleyemez veya belgeyi silemez.

Reporter yalnızca kendi deterministik rapor belgesini tekil `get` ile okuyabilir; genel `list` sorguları ve diğer kullanıcıların raporlarını okuma kapalıdır. Yönetici paneli veya istemci moderasyon yetkisi bulunmaz. Deterministik kimlik aynı reporter'ın aynı hedefi tekrar raporlamasını önler; Firestore Rules gerçek bir zaman tabanlı rate limiting sağlamaz.

## Kullanıcı ayarları

### `users/{uid}/private/settings`

Alanlar: `accountPrivacy`, `spoilerFilter`, `notificationPreferences`, `messagePermission`, `theme`, `updatedAt`. Yalnızca hesap sahibi okuyup yazabilir. Bu belge herkese açık profil sorgularından ayrıdır.

## Mesajlaşma

### `conversations/{conversationId}`

Alanlar: `participants` (iki UID), `createdBy`, `createdAt`, `updatedAt`; ilk yeni mesajla eklenen `lastMessageId`, `lastSenderUid`, `lastMessageAt`. Son mesaj meta alanlarında mesaj içeriği tutulmaz. Yalnızca katılımcılar okuyabilir. Oluşturan kullanıcı katılımcı olmalıdır. `participants`, `createdBy` ve `createdAt` istemciden sonradan değiştirilemez. Mesaj belgesi ile son mesaj meta alanları aynı batch içinde yazılır ve kurallar iki yönlü `getAfter()` doğrulaması yapar; meta alanları bulunmayan eski konuşmalar ilk yeni mesajla güvenli biçimde güncellenir.

### `conversations/{conversationId}/messages/{messageId}`

Alanlar: `senderUid`, `content`, `mediaUrl`, `createdAt`, `updatedAt`. Yalnızca konuşma katılımcıları okuyup mesaj gönderebilir. Gönderen UID Auth UID ile eşleşir ve değişmez. Kullanıcı yalnızca kendi mesajını düzenleyip silebilir.

## Topluluklar ve film kulüpleri

### `communities/{communityId}`

Alanlar: `ownerUid`, `name`, `nameLower`, `description`, `rules`, `category`, `theme`, `isPublic`, `isArchived`, `memberCount`, `postCount`, `createdAt`, `updatedAt`. Bu sürümde topluluklar herkese açıktır. Arşivlenen topluluk okunabilir ancak yeni üyelik ve etkileşim kabul etmez.

- `communities/{communityId}/members/{uid}`: `uid`, `role`, `createdAt`, `updatedAt`. Roller `owner`, `moderator`, `member`.
- `communities/{communityId}/posts/{postId}`: `communityId`, `ownerUid`, `type`, `content`, `spoiler`, medya alanları, `pollId`, `likeCount`, `replyCount`, `isPinned`, `createdAt`, `updatedAt`.
- `communities/{communityId}/posts/{postId}/likes/{uid}`: `uid`, `createdAt`.
- `communities/{communityId}/posts/{postId}/replies/{replyId}`: `ownerUid`, `content`, `spoiler`, `createdAt`, `updatedAt`.
- `communities/{communityId}/polls/{pollId}`: `communityId`, `postId`, `ownerUid`, `question`, `options`, `optionCounts`, `totalVotes`, `closesAt`, `createdAt`, `updatedAt`. `optionCounts` seçeneklerle aynı uzunlukta 2–4 elemanlı integer listesidir. Vote transaction'ında yalnızca vote belgesindeki `optionIndex` sayacı bir artabilir.
- `communities/{communityId}/polls/{pollId}/votes/{uid}`: `uid`, `optionIndex`, `createdAt`. Oy güncellenemez veya silinemez; kullanıcı yalnızca kendi oyunu tekil `get` ile okuyabilir.

Community bildirimleri mevcut `users/{recipientUid}/notifications/{notificationId}` yolunu kullanır. `community_post_like` için ID `communityPostLike_{communityId}_{postId}_{actorUid}`; `community_post_reply` için `communityPostReply_{communityId}_{postId}_{replyId}` biçimindedir. Community ID `targetId`, post ID `sourceId`, yalnızca reply bildiriminde reply ID `contextId` alanında tutulur. İçerik metni veya profil bilgisi kopyalanmaz.

## Sorgu ve sunucu notları

- Herkese açık listeler `where("isPublic", "==", true)` ile sorgulanmalıdır. Özel içerik sorguları sahip veya üyelik kısıtını içermelidir; Firestore kuralları filtre değildir.
- Bu sprintteki sınırlı bildirim türleri kaynak belgelerini doğrulayan olay-türü kurallarıyla istemciden üretilebilir. Moderasyon, fan-out, güvenilir hız sınırlama ve sayaç denormalizasyonları Admin SDK/Cloud Functions gerektirir.
- Takipçilere özel görünürlük için istemci sorgusu eklenmeden önce takip ilişkisini ölçeklenebilir şekilde doğrulayan sunucu veya dağıtılmış erişim modeli tasarlanmalıdır. Mevcut kural bu değeri yazılabilir kabul eder ancak genel okumaya açmaz.
- Yeni istemci servisleri geliştirilirken bu belgeyle birlikte `firestore.rules` alan listeleri güncel tutulmalıdır.

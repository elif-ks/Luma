export function validateUsername(username) {
  if (!username) return 'Kullanıcı adı zorunlu.'
  if (/\s/u.test(username)) return 'Kullanıcı adı boşluk içeremez.'

  const characterCount = Array.from(username).length
  if (characterCount < 3 || characterCount > 20) {
    return 'Kullanıcı adı 3–20 karakter olmalı.'
  }

  if (!/^\p{L}/u.test(username)) {
    return 'Kullanıcı adı harfle başlamalı.'
  }

  if (!/^\p{L}[\p{L}\p{N}_]*$/u.test(username)) {
    return 'Kullanıcı adı yalnızca harf, rakam ve alt çizgi içerebilir.'
  }

  return ''
}

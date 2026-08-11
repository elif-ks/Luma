export const LUMA_AVATARS = Array.from({ length: 12 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0')
  return { id: `luma-avatar-${number}`, name: `Luma avatarı ${index + 1}`, path: `/avatars/luma-avatar-${number}.svg` }
})
export function isAllowedAvatarPath(path) { return path === '' || LUMA_AVATARS.some((avatar) => avatar.path === path) }

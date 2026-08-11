import { useEffect, useState } from 'react'
export function UserAvatar({ profile, user, name, className = '', size, alt = '' }) {
  const label = name || profile?.username || user?.displayName || 'Luma'
  const source = profile?.photoURL || user?.photoURL || ''
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [source])
  const style = size ? { width: size, height: size, flexBasis: size } : undefined
  return <span className={`user-avatar ${className}`.trim()} style={style}>{source && !failed ? <img src={source} alt={alt || `${label} avatarı`} onError={() => setFailed(true)} /> : <span aria-hidden="true">{label.trim().charAt(0).toLocaleUpperCase('tr-TR') || 'L'}</span>}</span>
}

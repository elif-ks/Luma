import { Link } from 'react-router-dom'
import { Modal, SecondaryButton } from '../../design-system'
import { UserAvatar } from '../shared/UserAvatar'

export function FollowListModal({ title, items, empty, onClose }) {
  return <Modal title={title} onClose={onClose} footer={<SecondaryButton onClick={onClose}>Kapat</SecondaryButton>}>
    {items.length ? <div className="follow-user-list">{items.map((item) => item.profile ? <Link key={item.id} to={`/profile/${encodeURIComponent(item.profile.username)}`} onClick={onClose}><UserAvatar profile={item.profile} name={item.profile.username} className="avatar"/><div><strong>{item.profile.username}</strong>{item.profile.bio ? <p>{item.profile.bio.slice(0, 90)}</p> : null}</div></Link> : null)}</div> : <p>{empty}</p>}
  </Modal>
}

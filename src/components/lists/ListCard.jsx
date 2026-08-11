import { Link } from 'react-router-dom'
import { ContentLikeButton } from '../shared/ContentLikeButton'
import { SafetyMenu } from '../safety/SafetyMenu'

export function ListCard({ list, role }) {
  const ownerName = list.authorProfile?.username || 'Luma kullanıcısı'
  return (
    <article className="list-card-item list-card-real">
      <div className="list-card-cover"><span aria-hidden="true">L</span></div>
      <div className="list-card-body">
        <SafetyMenu targetUid={list.ownerUid} targetType="list" targetId={list.id} compact reportable={list.isPublic === true} />
        <Link to={`/lists/${list.id}`} className="review-title-link"><h3>{list.title}</h3></Link>
        <p>{list.description || 'Bu liste için henüz açıklama eklenmedi.'}</p>
        <div className="review-card-footer">
          <span>{list.itemCount || 0} yapım</span>
          <span>{list.isPublic ? 'Herkese açık' : 'Özel'}</span>
          {role ? <span className="list-role-badge">{role === 'editor' ? 'Editör' : 'Görüntüleyici'}</span> : null}
          <span>@{ownerName}</span>
          <ContentLikeButton type="list" contentId={list.id} enabled={list.isPublic === true} />
        </div>
      </div>
    </article>
  )
}

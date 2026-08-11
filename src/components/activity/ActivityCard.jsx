import { Link } from 'react-router-dom'
import { UserAvatar } from '../shared/UserAvatar'
import { getTmdbImageUrl } from '../../services/tmdbHelpers'

const timeLabel = (value) => {
  const date = typeof value?.toDate === 'function' ? value.toDate() : null
  return date ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : 'Şimdi'
}

export function ActivityCard({ activity }) {
  const profile = activity.actorProfile
  const source = activity.source
  const unavailable = (activity.type === 'review' || activity.type === 'list') && !source
  const [mediaType, mediaId] = String(activity.mediaKey || '').split('_')
  const sourceLink = activity.type === 'review' ? `/reviews/${activity.targetId}` : activity.type === 'list' ? `/lists/${activity.targetId}` : `/${mediaType}/${mediaId}`
  const description = activity.type === 'review' ? 'bir inceleme paylaştı' : activity.type === 'list' ? 'herkese açık bir liste oluşturdu' : `${mediaType === 'tv' ? 'bir dizi' : 'bir film'} izledi`
  const title = source?.title || (activity.type === 'watched' ? (mediaType === 'tv' ? 'İzlenen dizi' : 'İzlenen film') : 'İçerik')
  const poster = source?.posterPath ? getTmdbImageUrl(source.posterPath, 'w185') : ''
  const actor = <><UserAvatar profile={profile} name={profile?.username || 'Luma kullanıcısı'} className="avatar"/><span><strong>{profile?.username || 'Luma kullanıcısı'}</strong> {description}</span></>
  const sourceContent = <>{poster ? <img src={poster} alt="" loading="lazy"/> : <span className="activity-source-placeholder" aria-hidden="true">Luma</span>}<div><strong>{unavailable ? 'Bu içerik artık kullanılamıyor.' : title}</strong>{source?.rating ? <span>⭐ {source.rating}/5</span> : null}<small>{timeLabel(activity.createdAt)}</small></div></>
  return <article className="activity-card">{profile?.username ? <Link className="activity-actor" to={`/profile/${encodeURIComponent(profile.username)}`}>{actor}</Link> : <div className="activity-actor">{actor}</div>}{unavailable ? <div className="activity-source" aria-disabled="true">{sourceContent}</div> : <Link className="activity-source" to={sourceLink}>{sourceContent}</Link>}</article>
}

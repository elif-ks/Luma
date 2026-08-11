import { useCallback, useState } from 'react'
import { MediaPickerModal } from '../social/MediaPickerModal'
import { DiaryEntryModal } from './DiaryEntryModal'

export function DiaryCreateFlow({ user, initialDate, onClose, onSaved }) {
  const [media, setMedia] = useState(null)
  const close = useCallback(() => onClose(), [onClose])
  if (!media) return <MediaPickerModal onClose={close} onSelect={(item) => setMedia({ mediaId: item.id, mediaType: item.media_type, title: item.title || item.name || item.original_title || item.original_name || 'İsimsiz yapım', posterPath: item.poster_path || '', releaseDate: item.release_date || item.first_air_date || '' })} />
  return <DiaryEntryModal user={user} media={media} initialDate={initialDate} onChangeMedia={() => setMedia(null)} onClose={close} onSaved={onSaved} />
}

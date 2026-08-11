import { Link } from 'react-router-dom'

export function ReviewArticle({ review }) {
  return (
    <article className="review-article-card">
      <div className="review-article-cover" style={{ background: review.image }} />
      <div className="review-article-body">
        <p className="eyebrow">İnceleme</p>
        <h1>{review.title}</h1>
        <p className="review-article-meta">{review.author} · {review.readingTime} · {review.date}</p>
        <p>{review.preview}</p>
        <div className="review-article-sections">
          <div>
            <h3>Spoiler Bölümü</h3>
            <p>Bu bölüm, finalin etkisini ve karakter dönüşümünü anlatır; spoiler içermesi için okuyucunun onayı gerekir.</p>
          </div>
          <div>
            <h3>Sonuç</h3>
            <p>Film, atmosferini koruyarak sürükleyici ve düşünmeye sevk eden bir deneyim sunuyor.</p>
          </div>
        </div>
        <div className="review-actions-row">
          <button className="primary-btn">♡ Beğen</button>
          <button className="secondary-btn">🔖 Kaydet</button>
          <button className="secondary-btn">↗ Paylaş</button>
        </div>
        <div className="review-comments">
          <h3>Yorumlar</h3>
          <p>“Bu yazı çok iyi bir özet sunuyor.”</p>
          <p>“Film atmosferini çok iyi yakalamış.”</p>
        </div>
        <Link to="/reviews" className="review-title-link">← İncelemelere dön</Link>
      </div>
    </article>
  )
}

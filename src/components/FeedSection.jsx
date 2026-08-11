import { useState } from 'preact/hooks'
import { Link } from 'react-router-dom'

export function FeedSection({ posts }) {
  const [revealed, setRevealed] = useState({})
  const [liked, setLiked] = useState({})

  const toggleReveal = (id) => {
    setRevealed((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleLike = (id) => {
    setLiked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <section className="card-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Topluluk akışı</p>
          <h2>Bu hafta konuşulanlar</h2>
        </div>
      </div>

      <div className="feed-composer">
        <div className="composer-avatar" />
        <div className="composer-main">
          <div className="composer-input-row">
            <input placeholder="Bugün hangi film hakkında düşünüyorsun?" />
            <button className="composer-publish">Yayınla</button>
          </div>
          <div className="composer-meta">
            <button className="composer-chip">🎞 Film seç</button>
            <button className="composer-chip">⚠ Spoiler</button>
            <span className="composer-counter">140</span>
          </div>
        </div>
      </div>

      <div className="feed-list">
        {posts.map((post, index) => {
          const id = `${post.movie}-${index}`
          const isRevealed = Boolean(revealed[id])
          const isLiked = Boolean(liked[id])
          const isSpoiler = post.spoiler === true

          return (
            <article key={id} className="feed-card">
              <div className="feed-header">
                <Link to="/profile/elifks" className="user-row profile-link-row">
                  <div className="avatar" />
                  <div>
                    <h3>{post.user}</h3>
                    <p>{post.handle} · {post.time}</p>
                  </div>
                </Link>
                <span className="verified-pill">✓ Onaylı</span>
              </div>

              <div className="feed-movie-shell">
                <div className="feed-poster" />
                <div className="feed-movie-meta">
                  <div className="movie-line">
                    <span>★ {post.rating}</span>
                    <strong>{post.movie}</strong>
                  </div>
                  <div className="movie-meta-row">
                    <span>{post.year}</span>
                    <span>{post.runtime}</span>
                    <span>{post.genre}</span>
                  </div>
                </div>
              </div>

              <div className="feed-content">
                <p className={`feed-opinion ${isSpoiler && !isRevealed ? 'spoiler-blur' : ''}`}>
                  {post.text}
                </p>
                <div className="feed-tags">
                  {post.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              </div>

              {isSpoiler && !isRevealed ? (
                <div className="spoiler-card">
                  <span>⚠ Spoiler</span>
                  <button onClick={() => toggleReveal(id)}>İçeriği Göster</button>
                </div>
              ) : null}

              <div className="comment-preview">
                <div className="comment-item">
                  <strong>Aslı</strong>
                  <span>Bu sahne gerçekten çok güçlüydü.</span>
                </div>
                <div className="comment-item">
                  <strong>Can</strong>
                  <span>Son 10 dakika tam bir patlama.</span>
                </div>
              </div>

              <div className="feed-actions">
                <button className={`action-pill ${isLiked ? 'active' : ''}`} onClick={() => toggleLike(id)}>
                  <span>♡</span> {isLiked ? Number(post.likes) + 1 : post.likes}
                </button>
                <button className="action-pill"><span>💬</span> {post.comments}</button>
                <button className="action-pill"><span>🔖</span> {post.shares}</button>
                <button className="action-pill"><span>↗</span> Paylaş</button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

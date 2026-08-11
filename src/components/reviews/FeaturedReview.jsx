import { Link } from 'react-router-dom'

export function FeaturedReview({ review }) {
  return (
    <section className="featured-review-card">
      <div className="featured-review-visual" style={{ background: review.image }} />
      <div className="featured-review-content">
        <p className="eyebrow">Öne çıkan inceleme</p>
        <Link to={`/reviews/${review.id || 1}`} className="review-title-link">
          <h2>{review.title}</h2>
        </Link>
        <p>{review.preview}</p>
        <div className="review-card-footer">
          <span>{review.author}</span>
          <span>{review.readingTime}</span>
          <span>{review.date}</span>
        </div>
      </div>
    </section>
  )
}

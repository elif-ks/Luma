import { SectionTitle } from '../design-system'
import { ReviewCard } from './reviews/ReviewCard'
import { EmptyState } from './shared/EmptyState'
export function FeaturedReviews({ reviews }) { return <section className="card-section"><SectionTitle eyebrow="En yeni incelemeler" title="Topluluk yorumları" />{reviews.length ? <div className="review-grid">{reviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div> : <EmptyState title="Yorumlar boş" message="Henüz topluluk yorumu yok." />}</section> }

import { useEffect, useState } from 'preact/hooks'
import { HeroSection } from '../components/HeroSection'
import { MovieGrid } from '../components/MovieGrid'
import { FeaturedReviews } from '../components/FeaturedReviews'
import { LoadingSkeleton } from '../components/shared/LoadingSkeleton'
import { ErrorState } from '../components/shared/ErrorState'
import { getTrendingMovies } from '../services/tmdb'
import { attachReviewProfiles, subscribeToLatestReviews } from '../services/reviews'
import { SocialFeed } from '../components/social/SocialFeed'
import { ForYouSection } from '../components/recommendations/ForYouSection'
import { ActivityFeed } from '../components/activity/ActivityFeed'
import { MyCommunitiesFeed } from '../components/communities/MyCommunitiesFeed'
import { Link } from 'react-router-dom'

export function HomePage() {
  const [heroMovie, setHeroMovie] = useState(null)
  const [featuredMovies, setFeaturedMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviews, setReviews] = useState([])

  const loadHomeData = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await getTrendingMovies()
      const results = response.results || []
      setHeroMovie(results[0] || null)
      setFeaturedMovies(results.slice(1, 4))
    } catch (err) {
      setError(err.message || 'Ana sayfa verileri yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHomeData()
  }, [])
  useEffect(() => subscribeToLatestReviews(async (items) => setReviews(await attachReviewProfiles(items)), () => setReviews([]), 4), [])

  if (loading) {
    return <LoadingSkeleton rows={3} />
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadHomeData} />
  }

  return (
    <>
      <HeroSection movie={heroMovie} />
      <MovieGrid movies={featuredMovies} />
      <ForYouSection />
      <section className="card-section"><div className="section-header"><div><p className="eyebrow">Toplulukların</p><h2>Topluluklardan yeni gönderiler</h2></div><Link to="/communities">Tümünü gör</Link></div><MyCommunitiesFeed limit={4}/></section>
      <section className="card-section home-activity-section"><div className="section-header"><div><p className="eyebrow">Sosyal keşif</p><h2>Takip Ettiklerinin Aktiviteleri</h2></div><Link to="/activity">Tümünü gör</Link></div><ActivityFeed compact max={100}/></section>
      <SocialFeed limit={8} />
      <FeaturedReviews reviews={reviews} />
    </>
  )
}

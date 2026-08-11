import {
  discoverMoviesByGenre,
  discoverTVByGenre,
  getMovieDetails,
  getMovieRecommendations,
  getTVDetails,
  getTVRecommendations
} from './tmdb'

export const RECOMMENDATION_WEIGHTS = Object.freeze({
  favorite: 4,
  rating5: 4,
  rating4: 3,
  watched: 1,
  watchlist: 0.5
})

export const RECOMMENDATION_REQUEST_LIMITS = Object.freeze({
  seeds: 10,
  recommendationSeeds: 4,
  genresPerMediaType: 3,
  concurrency: 3,
  maximumTmdbRequests: 19
})

const resultCache = new Map()
const detailCache = new Map()
const CACHE_TTL = 5 * 60 * 1000

function mediaKey(mediaType, mediaId) { return `${mediaType}_${String(mediaId)}` }
function ratingWeight(value) { return Number(value) === 5 ? RECOMMENDATION_WEIGHTS.rating5 : Number(value) === 4 ? RECOMMENDATION_WEIGHTS.rating4 : 0 }

function addSignal(map, item, source, weight) {
  if (!weight || !['movie', 'tv'].includes(item?.mediaType) || item?.mediaId == null) return
  const key = mediaKey(item.mediaType, item.mediaId)
  const current = map.get(key) || { key, mediaType: item.mediaType, mediaId: String(item.mediaId), title: item.title || '', weight: 0, favorite: false, highRated: false }
  current.weight += weight
  current.favorite ||= source === 'favorite'
  current.highRated ||= source === 'review' || source === 'diary'
  if (!current.title && item.title) current.title = item.title
  map.set(key, current)
}

export function summarizeRecommendationSignals({ library = [], reviews = [], diary = [] }) {
  const seeds = new Map()
  const negativeKeys = new Set()
  library.forEach((item) => {
    if (item.favorite) addSignal(seeds, item, 'favorite', RECOMMENDATION_WEIGHTS.favorite)
    if (item.watched) addSignal(seeds, item, 'watched', RECOMMENDATION_WEIGHTS.watched)
    if (item.watchlist) addSignal(seeds, item, 'watchlist', RECOMMENDATION_WEIGHTS.watchlist)
  })
  reviews.forEach((item) => {
    if (Number(item.rating) <= 2) negativeKeys.add(mediaKey(item.mediaType, item.mediaId))
    else addSignal(seeds, item, 'review', ratingWeight(item.rating))
  })

  const bestDiaryRating = new Map()
  diary.forEach((item) => {
    const key = mediaKey(item.mediaType, item.mediaId)
    if (Number(item.rating) <= 2) negativeKeys.add(key)
    if (ratingWeight(item.rating) > ratingWeight(bestDiaryRating.get(key)?.rating)) bestDiaryRating.set(key, item)
  })
  bestDiaryRating.forEach((item) => addSignal(seeds, item, 'diary', ratingWeight(item.rating)))
  negativeKeys.forEach((key) => seeds.delete(key))

  const excludedKeys = new Set([
    ...library.map((item) => mediaKey(item.mediaType, item.mediaId)),
    ...diary.map((item) => mediaKey(item.mediaType, item.mediaId))
  ])
  const orderedSeeds = [...seeds.values()].sort((a, b) => b.weight - a.weight || a.key.localeCompare(b.key)).slice(0, RECOMMENDATION_REQUEST_LIMITS.seeds)
  const signature = orderedSeeds.map((item) => `${item.key}:${item.weight}`).join('|') + `#${[...excludedKeys].sort().join('|')}`
  const sufficient = orderedSeeds.some((item) => item.favorite || item.highRated) && orderedSeeds.reduce((sum, item) => sum + item.weight, 0) >= 3
  return { seeds: orderedSeeds, excludedKeys, signature, sufficient }
}

async function withConcurrency(items, worker, concurrency = RECOMMENDATION_REQUEST_LIMITS.concurrency) {
  const results = new Array(items.length)
  let cursor = 0
  async function run() {
    while (cursor < items.length) {
      const index = cursor++
      try { results[index] = await worker(items[index]) } catch { results[index] = null }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run))
  return results
}

function getSeedDetails(seed) {
  if (!detailCache.has(seed.key)) {
    const loader = seed.mediaType === 'tv' ? getTVDetails : getMovieDetails
    detailCache.set(seed.key, loader(seed.mediaId).catch((error) => { detailCache.delete(seed.key); throw error }))
  }
  return detailCache.get(seed.key)
}

function qualityCandidate(item, type) {
  const title = item?.title || item?.name
  return item && ['movie', 'tv'].includes(type) && item.id != null && title && item.poster_path && !item.adult && Number(item.vote_average || 0) >= 5 && Number(item.vote_count || 0) >= 20
}

function candidateScore(candidate, topGenreWeight) {
  const genreScore = candidate.genreMatches.reduce((sum, genre) => sum + genre.weight, 0) / Math.max(1, topGenreWeight)
  const rating = Math.max(0, Number(candidate.item.vote_average || 0) - 5) * 0.7
  const votes = Math.min(2.4, Math.log10(Number(candidate.item.vote_count || 0) + 1) * 0.65)
  const popularity = Math.min(1.5, Math.log10(Number(candidate.item.popularity || 0) + 1) * 0.55)
  return candidate.recommendationHits * 3 + genreScore * 3.5 + rating + votes + popularity
}

export function clearRecommendationCache(uid) {
  if (!uid) { resultCache.clear(); detailCache.clear(); return }
  for (const key of resultCache.keys()) if (key.startsWith(`${uid}:`)) resultCache.delete(key)
}

export async function getPersonalizedRecommendations({ uid, library, reviews, diary, limit = 20 }) {
  if (!uid) throw new Error('Kişisel öneriler için giriş yapmalısın.')
  const summary = summarizeRecommendationSignals({ library, reviews, diary })
  if (!summary.sufficient) return { items: [], genres: [], sufficient: false, requestCount: 0, signature: summary.signature }

  const cacheKey = `${uid}:${summary.signature}:${limit}`
  const cached = resultCache.get(cacheKey)
  if (cached && Date.now() - cached.createdAt < CACHE_TTL) return cached.value

  let requestCount = 0
  const detailResults = await withConcurrency(summary.seeds, async (seed) => { requestCount += 1; return getSeedDetails(seed) })
  const enrichedSeeds = summary.seeds.map((seed, index) => ({ ...seed, details: detailResults[index] })).filter((seed) => seed.details)
  if (!enrichedSeeds.length) throw new Error('Öneriler hazırlanırken TMDB verilerine ulaşılamadı. Lütfen tekrar dene.')

  const genreMap = new Map()
  enrichedSeeds.forEach((seed) => (seed.details.genres || []).forEach((genre) => {
    const key = `${seed.mediaType}_${genre.id}`
    const current = genreMap.get(key) || { key, mediaType: seed.mediaType, id: genre.id, name: genre.name, weight: 0 }
    current.weight += seed.weight
    genreMap.set(key, current)
  }))
  const genres = [...genreMap.values()].sort((a, b) => b.weight - a.weight).slice(0, 5)
  const topGenreWeight = genres[0]?.weight || 1
  const candidates = new Map()

  function collect(items, type, source = {}) {
    ;(items || []).forEach((item) => {
      if (!qualityCandidate(item, type)) return
      const key = mediaKey(type, item.id)
      if (summary.excludedKeys.has(key)) return
      const current = candidates.get(key) || { key, mediaType: type, item, recommendationHits: 0, sources: [], genreMatches: [] }
      if (source.seed) { current.recommendationHits += 1; current.sources.push(source.seed) }
      if (source.genre && !current.genreMatches.some((genre) => genre.key === source.genre.key)) current.genreMatches.push(source.genre)
      candidates.set(key, current)
    })
  }

  const recommendationSeeds = enrichedSeeds.filter((seed) => seed.favorite || seed.highRated).slice(0, RECOMMENDATION_REQUEST_LIMITS.recommendationSeeds)
  const recommendationResults = await withConcurrency(recommendationSeeds, async (seed) => {
    requestCount += 1
    const response = seed.mediaType === 'tv' ? await getTVRecommendations(seed.mediaId) : await getMovieRecommendations(seed.mediaId)
    return { response, seed }
  })
  recommendationResults.filter(Boolean).forEach(({ response, seed }) => collect(response.results, seed.mediaType, { seed }))

  const discoverGenres = ['movie', 'tv'].flatMap((type) => genres.filter((genre) => genre.mediaType === type).slice(0, RECOMMENDATION_REQUEST_LIMITS.genresPerMediaType))
  const discoverResults = await withConcurrency(discoverGenres, async (genre) => {
    requestCount += 1
    const response = genre.mediaType === 'tv' ? await discoverTVByGenre(genre.id) : await discoverMoviesByGenre(genre.id)
    return { response, genre }
  })
  if (![...recommendationResults, ...discoverResults].some(Boolean)) throw new Error('Öneri adayları şu anda yüklenemedi. Lütfen tekrar dene.')
  discoverResults.filter(Boolean).forEach(({ response, genre }) => collect(response.results, genre.mediaType, { genre }))

  candidates.forEach((candidate) => {
    const genreIds = candidate.item.genre_ids || []
    genres.filter((genre) => genre.mediaType === candidate.mediaType && genreIds.includes(genre.id)).forEach((genre) => {
      if (!candidate.genreMatches.some((match) => match.key === genre.key)) candidate.genreMatches.push(genre)
    })
  })

  const items = [...candidates.values()].map((candidate) => {
    const favoriteSource = candidate.sources.find((seed) => seed.favorite)
    const highRatedSource = candidate.sources.find((seed) => seed.highRated)
    const matchingGenre = [...candidate.genreMatches].sort((a, b) => b.weight - a.weight)[0]
    const reason = favoriteSource
      ? `Favorindeki ${favoriteSource.title || 'bir yapıma'} benziyor`
      : highRatedSource
        ? 'Yüksek puan verdiğin yapımlara benziyor'
        : matchingGenre
          ? `${matchingGenre.name} tercihlerinden dolayı`
          : 'Sevdiğin yapımlarla ortak türlere sahip'
    return { ...candidate.item, media_type: candidate.mediaType, reason, recommendationScore: candidateScore(candidate, topGenreWeight) }
  }).sort((a, b) => b.recommendationScore - a.recommendationScore).slice(0, limit)

  const value = { items, genres, sufficient: true, requestCount, signature: summary.signature }
  resultCache.set(cacheKey, { createdAt: Date.now(), value })
  return value
}

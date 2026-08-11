const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const accessToken = import.meta.env.VITE_TMDB_ACCESS_TOKEN

function assertAccessToken() {
  if (!accessToken) {
    throw new Error('TMDB yapılandırması eksik. Lütfen uygulama yöneticisiyle iletişime geçin.')
  }
}

function buildUrl(path, params = {}) {
  assertAccessToken()

  const url = new URL(`${TMDB_BASE_URL}${path}`)
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })

  return url
}

function getHeaders() {
  assertAccessToken()
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json;charset=utf-8'
  }
}

async function request(path, params = {}) {
  const response = await fetch(buildUrl(path, { language: 'tr-TR', ...params }), { headers: getHeaders() })
  if (!response.ok) throw new Error('TMDB verileri yüklenemedi. Lütfen tekrar deneyin.')
  return response.json()
}

export function getTrendingMovies() { return request('/trending/movie/day') }

export function getTrendingTV() { return request('/trending/tv/day') }

export async function searchMulti(query, page = 1) { return request('/search/multi', { query, page, include_adult: false }) }

export function getPopularMovies(page = 1) { return request('/movie/popular', { page }) }
export function getTopRatedMovies(page = 1) { return request('/movie/top_rated', { page }) }
export function getUpcomingMovies(page = 1) { return request('/movie/upcoming', { page }) }
export function getPopularTV(page = 1) { return request('/tv/popular', { page }) }
export function discoverMoviesByGenre(genreId, page = 1) { return request('/discover/movie', { with_genres: genreId, page, sort_by: 'popularity.desc', include_adult: false }) }
export function discoverTVByGenre(genreId, page = 1) { return request('/discover/tv', { with_genres: genreId, page, sort_by: 'popularity.desc', include_adult: false }) }
export function getTVDetails(id) { return request(`/tv/${id}`) }
export function getTVCredits(id) { return request(`/tv/${id}/credits`) }
export function getTVVideos(id) { return request(`/tv/${id}/videos`) }
export function getTVRecommendations(id) { return request(`/tv/${id}/recommendations`) }

export async function getMovieDetails(id) {
  return request(`/movie/${id}`)
}

export function getMovieCredits(id) { return request(`/movie/${id}/credits`) }

export function getMovieVideos(id) { return request(`/movie/${id}/videos`) }

export function getMovieSimilar(id) { return request(`/movie/${id}/similar`) }

export async function getMovieRecommendations(id) {
  return request(`/movie/${id}/recommendations`, { page: 1 })
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

export function getTmdbImageUrl(path, size = 'w500') {
  if (!path) return ''
  return `${TMDB_IMAGE_BASE}/${size}${path}`
}

export function getTmdbBackdropUrl(path) {
  if (!path) return ''
  return `${TMDB_IMAGE_BASE}/original${path}`
}

export function toYear(dateString) {
  if (!dateString) return '—'
  return new Date(dateString).getFullYear() || '—'
}

export function formatRating(value) {
  if (value === null || value === undefined) return '—'
  return Number(value).toFixed(1)
}

export function formatRuntime(minutes) {
  if (!minutes) return '—'
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours} sa ${remainingMinutes} dk`
}

export function formatCurrency(value) {
  if (value === null || value === undefined || value === 0) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value)
}

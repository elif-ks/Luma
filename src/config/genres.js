export const GENRES = [
  { slug: 'aksiyon', label: 'Aksiyon', movieId: 28, tvId: 10759 },
  { slug: 'komedi', label: 'Komedi', movieId: 35, tvId: 35 },
  { slug: 'dram', label: 'Dram', movieId: 18, tvId: 18 },
  { slug: 'animasyon', label: 'Animasyon', movieId: 16, tvId: 16 },
  { slug: 'gizem', label: 'Gizem', movieId: 9648, tvId: 9648 },
  { slug: 'suc', label: 'Suç', movieId: 80, tvId: 80 },
  { slug: 'aile', label: 'Aile', movieId: 10751, tvId: 10751 },
  { slug: 'belgesel', label: 'Belgesel', movieId: 99, tvId: 99 },
  { slug: 'bilim-kurgu', label: 'Bilim Kurgu', movieId: 878, tvId: 10765 }
]

export function getGenreBySlug(slug) { return GENRES.find((genre) => genre.slug === slug) }

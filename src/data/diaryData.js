export const diaryData = {
  stats: {
    watchedThisMonth: 18,
    averageRating: '4.6',
    longestStreak: '12 gün',
    favoriteGenre: 'Bilim Kurgu'
  },
  entries: [
    {
      id: 1,
      title: 'Gece Rüzgârı',
      date: '3 Ağustos',
      rating: '5.0',
      mood: 'Hüzünlü',
      note: 'Sessizliğin gücü beni çok etkiledi. Bu filmde her sahne bir his bırakıyor.',
      badge: 'Favori',
      image: 'linear-gradient(135deg, #ff5e7d, #ff8a4c)'
    },
    {
      id: 2,
      title: 'Karanlık Deniz',
      date: '1 Ağustos',
      rating: '4.7',
      mood: 'Sakin',
      note: 'Atmosfer ve ritim çok dengeli. İki bölümünü birden izledim.',
      badge: 'Tekrar İzle',
      image: 'linear-gradient(135deg, #4a79ff, #6d5dfc)'
    }
  ],
  timeline: [
    { day: '3 Ağustos', title: 'Gece Rüzgârı', detail: '5 yıldız, favori kutusu' },
    { day: '1 Ağustos', title: 'Karanlık Deniz', detail: 'İzleme günlüğüne eklendi' }
  ]
}

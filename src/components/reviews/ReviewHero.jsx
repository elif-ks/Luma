export function ReviewHero({ title, subtitle }) {
  return (
    <section className="review-hero-card">
      <div>
        <p className="eyebrow">Yazılar ve izlenimler</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </section>
  )
}

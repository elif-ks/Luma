export function ListHero({ title, subtitle }) {
  return (
    <section className="review-hero-card">
      <div>
        <p className="eyebrow">Luma koleksiyonları</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </section>
  )
}

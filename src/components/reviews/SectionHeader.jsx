export function SectionHeader({ title, subtitle }) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{subtitle}</p>
        <h2>{title}</h2>
      </div>
    </div>
  )
}

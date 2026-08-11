export function CrewSection({ crew }) {
  return (
    <div className="crew-section">
      {crew.map((item) => (
        <div key={item.label} className="crew-card">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  )
}

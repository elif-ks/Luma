export function TimelineItem({ item }) {
  return (
    <div className="timeline-item">
      <strong>{item.day}</strong>
      <p>{item.title}</p>
      <span>{item.detail}</span>
    </div>
  )
}

export function LoadingSkeleton({ rows = 3 }) {
  return (
    <div className="loading-skeleton-stack">
      <div className="skeleton-card skeleton-hero" />
      <div className="skeleton-grid">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="skeleton-card" />
        ))}
      </div>
    </div>
  )
}

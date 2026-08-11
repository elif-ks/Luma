export function PageLoadingFallback({ message = 'Sayfa hazırlanıyor…' }) {
  return (
    <section className="page-loading-fallback" role="status" aria-live="polite" aria-busy="true">
      <span className="page-loading-fallback__glow" aria-hidden="true" />
      <div className="page-loading-fallback__lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <span className="sr-only">{message}</span>
    </section>
  )
}

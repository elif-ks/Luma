import { Link, useNavigate } from 'react-router-dom'

export function NotFoundPage() {
  const navigate = useNavigate()

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <section className="not-found-page" aria-labelledby="not-found-title">
      <div className="not-found-page__glow" aria-hidden="true" />
      <div className="not-found-page__content">
        <p className="not-found-page__code" aria-label="Hata kodu 404">404</p>
        <h1 id="not-found-title">Sayfa bulunamadı</h1>
        <p className="not-found-page__description">
          Aradığın sayfa kaldırılmış, taşınmış veya hiç var olmamış olabilir.
        </p>
        <div className="not-found-page__actions">
          <Link className="primary-btn" to="/">Ana sayfaya dön</Link>
          <button type="button" className="secondary-btn" onClick={handleBack}>Geri dön</button>
        </div>
      </div>
    </section>
  )
}

import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="card-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">404</p>
          <h2>Sayfa bulunamadı</h2>
        </div>
      </div>
      <div className="profile-section-card">
        <p>İstenen yol mevcut değil.</p>
        <Link className="primary-btn" to="/">Ana sayfaya dön</Link>
      </div>
    </section>
  )
}

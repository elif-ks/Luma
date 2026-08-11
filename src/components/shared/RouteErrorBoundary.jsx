import { Component } from 'react'
import { Link, useLocation } from 'react-router-dom'

class RouteErrorBoundaryInner extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Luma sayfası oluşturulurken beklenmeyen bir hata oluştu.', error, info)
  }

  componentDidUpdate(previousProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <section className="card-section route-error-state" role="alert">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Bir sorun oluştu</p>
            <h2>Sayfa şu anda görüntülenemiyor</h2>
          </div>
        </div>
        <div className="profile-section-card">
          <p>Sayfayı yenileyebilir veya ana sayfaya dönebilirsin.</p>
          <Link className="primary-btn" to="/">Ana sayfaya dön</Link>
        </div>
      </section>
    )
  }
}

export function RouteErrorBoundary({ children }) {
  const location = useLocation()
  return <RouteErrorBoundaryInner resetKey={location.key}>{children}</RouteErrorBoundaryInner>
}

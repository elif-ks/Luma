import { Component } from 'preact'

export class AppErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidMount() {
    window.addEventListener('popstate', this.handleRouteChange)
    window.addEventListener('hashchange', this.handleRouteChange)
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('Luma arayüzünde beklenmeyen bir render hatası oluştu.', error, errorInfo)
    }
  }

  componentWillUnmount() {
    window.removeEventListener('popstate', this.handleRouteChange)
    window.removeEventListener('hashchange', this.handleRouteChange)
  }

  handleRouteChange = () => {
    if (this.state.hasError) this.setState({ hasError: false })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="app-error-boundary" aria-labelledby="app-error-title">
        <div className="app-error-boundary__glow" aria-hidden="true" />
        <section className="app-error-boundary__content" role="alert">
          <p className="eyebrow">Luma</p>
          <h1 id="app-error-title">Bir şeyler ters gitti</h1>
          <p>Sayfa görüntülenirken beklenmeyen bir sorun oluştu.</p>
          <div className="app-error-boundary__actions">
            <button type="button" className="primary-btn" onClick={this.handleReload}>Sayfayı yenile</button>
            <a className="secondary-btn" href="/">Ana sayfaya dön</a>
          </div>
        </section>
      </main>
    )
  }
}

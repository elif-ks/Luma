import { Link } from 'react-router-dom'
import { GlassCard, PrimaryButton, SecondaryButton } from '../../design-system'

export function AuthPage({ title, subtitle, children, footerText, footerLink, footerHref, actionLabel, actionHandler, loading = false }) {
  return (
    <div className="auth-page-shell">
      <GlassCard className="auth-card">
        <div className="auth-card-header">
          <img className="auth-brand-mark" src="/luma-logo.png" alt="Luma" />
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={(event) => {
          event.preventDefault()
          actionHandler?.(event)
        }}>
          {children}
          <div className="auth-actions">
            <PrimaryButton type="submit" disabled={loading}>{loading ? 'Bekleniyor…' : actionLabel}</PrimaryButton>
            <Link to="/" className="auth-link-btn">
              <SecondaryButton type="button">Ana sayfaya dön</SecondaryButton>
            </Link>
          </div>
        </form>

        {footerText ? (
          <div className="auth-footer">
            <span>{footerText}</span>
            <Link to={footerHref}>{footerLink}</Link>
          </div>
        ) : null}
      </GlassCard>
    </div>
  )
}

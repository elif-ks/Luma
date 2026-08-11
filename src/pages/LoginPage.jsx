import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthPage } from '../components/auth/AuthPage'

export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signIn, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!email.trim()) {
      setFormError('E-posta adresi zorunlu.')
      return
    }

    if (!password) {
      setFormError('Şifre zorunlu.')
      return
    }

    try {
      await signIn(email, password)
      const destination = typeof location.state?.from === 'string' && location.state.from.startsWith('/')
        ? location.state.from
        : '/'
      navigate(destination, { replace: true })
    } catch (e) {
      setFormError(e.message)
    }
  }

  return (
    <AuthPage
      title="Luma'ya giriş yap"
      subtitle="Film, dizi ve arkadaş etkinliklerini takip etmeye devam et."
      actionLabel="Giriş yap"
      actionHandler={handleSubmit}
      loading={loading}
      footerText="Hesabın yok mu?"
      footerLink="Kayıt ol"
      footerHref="/register"
    >
      {location.state?.registrationMessage ? (
        <p className="auth-message auth-message-success">{location.state.registrationMessage}</p>
      ) : null}
      {formError || error ? <p className="auth-message auth-message-error">{formError || error}</p> : null}
      <label className="auth-field">
        <span>E-posta</span>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ornek@luma.com" />
      </label>
      <label className="auth-field">
        <span>Şifre</span>
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
      </label>
      <div className="auth-inline-links">
        <Link to="/forgot-password">Şifremi unuttum</Link>
      </div>
    </AuthPage>
  )
}

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { AuthPage } from '../components/auth/AuthPage'

export function ForgotPasswordPage() {
  const { resetPassword, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleSubmit = async () => {
    setFormError('')
    setSuccessMessage('')

    if (!email.trim()) {
      setFormError('E-posta adresi zorunlu.')
      return
    }

    try {
      await resetPassword(email.trim())
      setSuccessMessage('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.')
    } catch (submitError) {
      setFormError(submitError.message)
    }
  }

  return (
    <AuthPage
      title="Şifrenizi sıfırlayın"
      subtitle="Luma hesabınıza bağlı e-posta adresini yazın; size bir sıfırlama bağlantısı gönderelim."
      actionLabel="Sıfırlama bağlantısı gönder"
      actionHandler={handleSubmit}
      loading={loading}
      footerText="Şifrenizi hatırladınız mı?"
      footerLink="Giriş yap"
      footerHref="/login"
    >
      {formError || error ? <p className="auth-message auth-message-error">{formError || error}</p> : null}
      {successMessage ? <p className="auth-message auth-message-success">{successMessage}</p> : null}
      <label className="auth-field">
        <span>E-posta</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="ornek@luma.com"
          autoComplete="email"
        />
      </label>
    </AuthPage>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthPage } from '../components/auth/AuthPage'
import { validateUsername } from '../utils/username'

export function RegisterPage() {
  const navigate = useNavigate()
  const { signUp, loading, error } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [accountMessage, setAccountMessage] = useState('')
  const [serverErrorDismissed, setServerErrorDismissed] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    setAccountMessage('')
    setServerErrorDismissed(false)

    const usernameError = validateUsername(username)
    if (usernameError) {
      setFormError(usernameError)
      return
    }

    if (!email.trim()) {
      setFormError('E-posta adresi zorunlu.')
      return
    }

    if (!password || password.length < 6) {
      setFormError('Şifre en az 6 karakter olmalı.')
      return
    }

    if (password !== confirmPassword) {
      setFormError('Şifreler eşleşmiyor.')
      return
    }

    try {
      const result = await signUp(username, email.trim(), password)

      if (result.profileCreated && result.displayNameUpdated && result.verificationSent && result.signedOut) {
        navigate('/login', {
          replace: true,
          state: {
            registrationMessage: 'Hesabın oluşturuldu. Giriş yapmadan önce e-posta adresine gönderilen doğrulama bağlantısını aç.'
          }
        })
        return
      }

      const accountIssues = []
      if (!result.displayNameUpdated) accountIssues.push(`Auth kullanıcı adı güncellenemedi: ${result.displayNameError}`)
      if (!result.verificationSent) accountIssues.push(`Doğrulama e-postası gönderilemedi: ${result.verificationError}`)
      if (!result.signedOut) accountIssues.push(`Oturum kapatılamadı: ${result.signOutError}`)
      setAccountMessage(`Hesabın oluşturuldu. ${accountIssues.join(' ')}`)
    } catch (e) {
      setFormError(e.message)
    }
  }

  return (
    <AuthPage
      title="Luma hesabı oluştur"
      subtitle="Kendi listelerini, incelemelerini ve izleme akışını oluştur."
      actionLabel="Hesap oluştur"
      actionHandler={handleSubmit}
      loading={loading}
      footerText="Zaten hesabın var mı?"
      footerLink="Giriş yap"
      footerHref="/login"
    >
      {formError || (!serverErrorDismissed && error) ? (
        <p className="auth-message auth-message-error">{formError || error}</p>
      ) : null}
      {accountMessage ? <p className="auth-message auth-message-warning">{accountMessage}</p> : null}
      <label className="auth-field">
        <span>Kullanıcı adı</span>
        <input
          type="text"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value)
            setFormError('')
            setServerErrorDismissed(true)
          }}
          placeholder="Kullanıcı adını gir"
          autoComplete="username"
        />
      </label>
      <label className="auth-field">
        <span>E-posta</span>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ornek@luma.com" />
      </label>
      <label className="auth-field">
        <span>Şifre</span>
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
      </label>
      <label className="auth-field">
        <span>Şifreyi doğrula</span>
        <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="••••••••" />
      </label>
    </AuthPage>
  )
}

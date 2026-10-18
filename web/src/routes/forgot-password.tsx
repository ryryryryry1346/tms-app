import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { Alert } from '../components/ui/Alert'
import { Input } from '../components/ui/Input'
import { AuthShell } from '../components/auth/AuthShell'
import { getCurrentUser } from '../features/auth/server'
import { requestPasswordReset } from '../lib/auth-client'
import { useT } from '../lib/i18n'

export const Route = createFileRoute('/forgot-password')({
  loader: async () => {
    const user = await getCurrentUser()

    if (user) {
      throw redirect({
        to: '/',
      })
    }

    return null
  },
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const t = useT()

  const [email, setEmail] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const formData = new FormData(event.currentTarget)
      const submitted = String(formData.get('email') ?? '')
        .trim()
        .toLowerCase()

      if (!submitted) {
        setErrorMessage('Email is required.')
        return
      }

      const result = await requestPasswordReset({
        email: submitted,
        redirectTo: '/reset-password',
      })

      if (result.error) {
        setErrorMessage(
          result.error.message ?? 'Unable to send password reset email.',
        )
        return
      }

      setSubmittedEmail(submitted)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      title={t('Reset password')}
      subtitle={submittedEmail ? undefined : t('We will email you a link to set a new password.')}
    >
      {submittedEmail ? (
        <>
          <Alert variant="success">{t('If an account exists for')}{' '}
            <span className="font-semibold">{submittedEmail}</span>{t(', we sent a password reset link.')}</Alert>
          <Link to="/login" className="auth-min__button auth-min__button--primary">
            {t('Back to login')}
          </Link>
        </>
      ) : (
        <form className="auth-min__form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="forgot-email">
            {t('Email')}
          </label>
          <Input
            id="forgot-email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder={t('Email')}
            autoComplete="email"
          />

          {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="auth-min__button auth-min__button--primary"
          >
            {isSubmitting ? t('Sending reset link...') : t('Send reset link')}
          </button>

          <div className="auth-min__links auth-min__links--center">
            <span>{t('Remembered it?')}</span>
            <Link to="/login">{t('Log in')}</Link>
          </div>
        </form>
      )}
    </AuthShell>
  )
}

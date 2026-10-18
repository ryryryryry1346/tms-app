import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { Alert } from '../components/ui/Alert'
import { PasswordInput } from '../components/ui/PasswordInput'
import { AuthShell } from '../components/auth/AuthShell'
import { getCurrentUser } from '../features/auth/server'
import { resetPassword } from '../lib/auth-client'
import { useT } from '../lib/i18n'

export const Route = createFileRoute('/reset-password')({
  validateSearch: z.object({
    error: z.string().optional(),
    token: z.string().optional(),
  }),
  loader: async () => {
    const user = await getCurrentUser()

    if (user) {
      throw redirect({
        to: '/',
      })
    }

    return null
  },
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const t = useT()

  const navigate = useNavigate()
  const search = Route.useSearch()
  const token = search.token ?? null
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(
    search.error ? 'This password reset link is invalid or expired.' : null,
  )
  const [isComplete, setIsComplete] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      if (!token) {
        setErrorMessage('This password reset link is invalid or expired.')
        return
      }

      if (!password || !confirmPassword) {
        setErrorMessage('New password and confirmation are required.')
        return
      }

      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.')
        return
      }

      const result = await resetPassword({
        newPassword: password,
        token,
      })

      if (result.error) {
        setErrorMessage(
          result.error.message ?? 'Unable to reset password right now.',
        )
        return
      }

      setIsComplete(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function goToLogin(): Promise<void> {
    await navigate({
      to: '/login',
      replace: true,
    })
  }

  return (
    <AuthShell title={t('New password')}>
      {isComplete ? (
        <>
          <Alert variant="success">{t('Your password has been reset. You can log in with the new password.')}</Alert>
          <button
            type="button"
            onClick={goToLogin}
            className="auth-min__button auth-min__button--primary"
          >
            {t('Go to login')}
          </button>
        </>
      ) : (
        <form className="auth-min__form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="reset-password">
            {t('New password')}
          </label>
          <PasswordInput
            id="reset-password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t('New password, at least 8 characters')}
            autoComplete="new-password"
          />

          <label className="sr-only" htmlFor="reset-confirm">
            {t('Confirm password')}
          </label>
          <PasswordInput
            id="reset-confirm"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder={t('Repeat the new password')}
            autoComplete="new-password"
          />

          {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

          <button
            type="submit"
            disabled={isSubmitting || !token}
            className="auth-min__button auth-min__button--primary"
          >
            {isSubmitting ? t('Saving password...') : t('Save new password')}
          </button>

          <div className="auth-min__links auth-min__links--center">
            <span>{t('Need a new link?')}</span>
            <Link to="/forgot-password">{t('Request reset')}</Link>
          </div>
        </form>
      )}
    </AuthShell>
  )
}

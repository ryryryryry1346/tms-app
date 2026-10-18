import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { Alert } from '../components/ui/Alert'
import { Input } from '../components/ui/Input'
import { PasswordInput } from '../components/ui/PasswordInput'
import { cx } from '../components/ui/utils'
import { AuthShell } from '../components/auth/AuthShell'
import { SlackSignInButton } from '../components/auth/SlackSignInButton'
import { getAuthProviders, getCurrentUser } from '../features/auth/server'
import { signUp } from '../lib/auth-client'
import { useT } from '../lib/i18n'

export const Route = createFileRoute('/register')({
  loader: async () => {
    const [user, providers] = await Promise.all([
      getCurrentUser(),
      getAuthProviders(),
    ])

    if (user) {
      throw redirect({
        to: '/',
      })
    }

    return { providers }
  },
  component: RegisterPage,
})

function RegisterPage() {
  const t = useT()
  const { providers } = Route.useLoaderData()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      const submittedName = String(formData.get('name') ?? '').trim()
      const submittedEmail = String(formData.get('email') ?? '')
        .trim()
        .toLowerCase()
      const submittedPassword = String(formData.get('password') ?? '')

      if (!submittedName || !submittedEmail || !submittedPassword) {
        setErrorMessage('Name, email, and password are required.')
        return
      }

      const result = await signUp.email({
        name: submittedName,
        email: submittedEmail,
        password: submittedPassword,
        callbackURL: '/login',
      })

      if (result.error) {
        setErrorMessage(
          result.error.message ?? 'Unable to create account right now.',
        )
        return
      }

      setSubmittedEmail(submittedEmail)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      title={submittedEmail ? t('Check your email') : t('Create account')}
      subtitle={
        !submittedEmail && providers.slack?.workspaceName
          ? t('{name} workspace', { name: providers.slack.workspaceName })
          : undefined
      }
    >
      {submittedEmail ? (
        <>
          <Alert variant="success">{t('We sent a verification link to')}{' '}
            <span className="font-semibold">{submittedEmail}</span>{t('. Open it to confirm your email before logging in.')}</Alert>
          <Link to="/login" className="auth-min__button auth-min__button--primary">
            {t('Go to login')}
          </Link>
        </>
      ) : (
        <>
          {providers.slack ? <SlackSignInButton callbackURL="/" /> : null}

          <form
            className={cx(
              'auth-min__form',
              providers.slack && 'auth-min__form--divided',
            )}
            onSubmit={handleSubmit}
          >
            <label className="sr-only" htmlFor="register-name">
              {t('Name')}
            </label>
            <Input
              id="register-name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('Name')}
              autoComplete="name"
            />

            <label className="sr-only" htmlFor="register-email">
              {t('Email')}
            </label>
            <Input
              id="register-email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder={t('Email')}
              autoComplete="email"
            />

            <label className="sr-only" htmlFor="register-password">
              {t('Password')}
            </label>
            <PasswordInput
              id="register-password"
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t('Password, at least 8 characters')}
              autoComplete="new-password"
            />

            {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className={cx(
                'auth-min__button',
                providers.slack
                  ? 'auth-min__button--secondary'
                  : 'auth-min__button--primary',
              )}
            >
              {isSubmitting ? t('Sending verification...') : t('Create account')}
            </button>

            <div className="auth-min__links auth-min__links--center">
              <span>{t('Already have an account?')}</span>
              <Link to="/login">{t('Log in')}</Link>
            </div>
          </form>
        </>
      )}
    </AuthShell>
  )
}

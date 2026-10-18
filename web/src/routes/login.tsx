import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PasswordInput } from '../components/ui/PasswordInput'
import { Panel } from '../components/ui/Panel'
import { SlackSignInButton } from '../components/auth/SlackSignInButton'
import { getAuthProviders, getCurrentUser } from '../features/auth/server'
import { sendVerificationEmail, signIn } from '../lib/auth-client'
import { useT } from '../lib/i18n'
import { describeSlackSignInError } from '../lib/slackAuth'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    redirectTo: z.string().optional(),
    // OAuth error code set by Better Auth (or our Slack workspace check).
    error: z.string().max(100).optional(),
  }),
  loaderDeps: ({ search }) => ({ error: search.error }),
  loader: async ({ deps }) => {
    const [user, providers] = await Promise.all([
      getCurrentUser(),
      getAuthProviders(),
    ])

    if (user) {
      // A signed-in user lands here only from "Connect Slack" in Account.
      if (deps.error) {
        throw redirect({ to: '/account', search: { slackError: deps.error } })
      }

      throw redirect({ to: '/' })
    }

    return { providers }
  },
  component: LoginPage,
})

function LoginPage() {
  const t = useT()

  const navigate = useNavigate()
  const router = useRouter()
  const search = Route.useSearch()
  const redirectTo = getSafeRedirectTo(search.redirectTo)
  const { providers } = Route.useLoaderData()
  const slackErrorMessage = search.error
    ? t(describeSlackSignInError(search.error))
    : null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setErrorMessage(null)
    setUnverifiedEmail(null)
    setResendMessage(null)
    setIsSubmitting(true)

    try {
      const formData = new FormData(event.currentTarget)
      const submittedEmail = String(formData.get('email') ?? '')
        .trim()
        .toLowerCase()
      const submittedPassword = String(formData.get('password') ?? '')

      if (!submittedEmail || !submittedPassword) {
        setErrorMessage('Email and password are required.')
        return
      }

      const result = await signIn.email({
        email: submittedEmail,
        password: submittedPassword,
      })

      if (result.error) {
        const message = result.error.message ?? 'Invalid credentials.'
        const normalizedMessage = message.toLowerCase()
        const needsVerification =
          normalizedMessage.includes('verify') ||
          normalizedMessage.includes('verification')

        if (needsVerification) {
          setUnverifiedEmail(submittedEmail)
          setErrorMessage(null)
        } else {
          setErrorMessage(message)
        }
        return
      }

      await router.invalidate()
      await navigate({
        href: redirectTo,
        replace: true,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResendVerification(): Promise<void> {
    if (!unverifiedEmail) {
      return
    }

    setIsResending(true)
    setErrorMessage(null)
    setResendMessage(null)

    try {
      const result = await sendVerificationEmail({
        email: unverifiedEmail,
        callbackURL: '/login',
      })

      if (result.error) {
        setErrorMessage(
          result.error.message ?? 'Unable to send verification email right now.',
        )
        return
      }

      setResendMessage(`Verification email sent to ${unverifiedEmail}.`)
    } finally {
      setIsResending(false)
    }
  }

  return (
    <main className="auth-page page-wrap px-4 py-8 sm:py-12">
      <Panel className="auth-card rise-in mx-auto flex min-h-[35rem] w-full max-w-[35rem] flex-col p-8 sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="display-title mb-0 text-5xl font-extrabold tracking-tight text-[var(--tms-text)]">{t('Login')}</h1>
        </div>

        {slackErrorMessage ? (
          <Alert variant="danger" className="mb-5">
            {slackErrorMessage}
          </Alert>
        ) : null}

        {providers.slack ? (
          <SlackSignInButton
            callbackURL={redirectTo}
            workspaceName={providers.slack.workspaceName}
            label={slackErrorMessage ? t('Try again with Slack') : undefined}
          />
        ) : null}

        <form className="grid flex-1 content-start gap-5" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-left">
            <span className="text-lg font-medium text-[var(--tms-text-muted)]">{t('Email')}</span>
            <Input
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              size="lg"
              className="auth-input rounded-2xl px-5 py-4 text-lg"
              placeholder={t('you@example.com')}
              autoComplete="email"
            />
          </label>

          <label className="grid gap-2 text-left">
            <span className="text-lg font-medium text-[var(--tms-text-muted)]">{t('Password')}</span>
            <PasswordInput
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              size="lg"
              className="auth-input rounded-2xl px-5 py-4 text-lg"
              placeholder={t('Enter your password')}
              autoComplete="current-password"
            />
          </label>

          {errorMessage ? (
            <Alert variant="danger">
              {errorMessage}
            </Alert>
          ) : null}

          {unverifiedEmail ? (
            <Alert variant="warning" className="grid gap-3 px-4 py-4">
              <div>
                <p className="m-0 font-semibold">{t('Verify your email to continue.')}</p>
                <p className="m-0 mt-1">{t('We sent a verification link to')}{' '}
                  <span className="font-semibold">{unverifiedEmail}</span>{t('. If it expired or did not arrive, send a new one.')}</p>
              </div>
              <Button
                type="button"
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-fit rounded-xl px-4 py-2 font-semibold shadow-none"
              >
                {isResending ? t('Sending...') : t('Send verification again')}
              </Button>
              {resendMessage ? (
                <p className="m-0 text-[var(--tms-success)]">{resendMessage}</p>
              ) : null}
            </Alert>
          ) : null}

          <Button
            type="submit"
            disabled={isSubmitting}
            variant="primary"
            size="lg"
            className="mt-auto rounded-2xl px-5 py-4 text-lg font-bold shadow-[var(--tms-shadow-subtle)]"
          >
            {isSubmitting ? t('Logging in...') : t('Log in')}
          </Button>

          <p className="pt-2 text-center text-lg text-[var(--tms-text-muted)]">
            <Link
              to="/forgot-password"
              className="font-semibold text-[var(--tms-primary)] no-underline"
            >{t('Forgot password?')}</Link>
          </p>

          <p className="text-center text-lg text-[var(--tms-text-muted)]">{t('Don\'t have an account?')}{' '}
            <Link
              to="/register"
              className="font-semibold text-[var(--tms-primary)] no-underline"
            >{t('Create one now')}</Link>
            .
          </p>
        </form>
      </Panel>
    </main>
  )
}

function getSafeRedirectTo(value: string | undefined): string {
  if (!value) {
    return '/'
  }

  try {
    const decoded = decodeURIComponent(value)

    if (
      decoded.startsWith('/') &&
      !decoded.startsWith('//') &&
      !decoded.startsWith('/login') &&
      !decoded.startsWith('/register') &&
      !decoded.startsWith('/forgot-password') &&
      !decoded.startsWith('/reset-password') &&
      !decoded.startsWith('/api/auth') &&
      !decoded.startsWith('/_serverFn')
    ) {
      return decoded
    }
  } catch {
    return '/'
  }

  return '/'
}

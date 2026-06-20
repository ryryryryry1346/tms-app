import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { PasswordInput } from '../components/ui/PasswordInput'
import { Panel } from '../components/ui/Panel'
import { getCurrentUser } from '../features/auth/server'
import { resetPassword } from '../lib/auth-client'

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
    <main className="auth-page page-wrap px-4 py-8 sm:py-12">
      <Panel className="auth-card rise-in mx-auto flex min-h-[32rem] w-full max-w-[35rem] flex-col p-8 sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="display-title mb-0 text-5xl font-extrabold tracking-tight text-[var(--tms-text)]">
            New password
          </h1>
        </div>

        {isComplete ? (
          <div className="grid flex-1 content-start gap-5 text-center">
            <Alert variant="success" className="px-5 py-4 text-left">
              Your password has been reset. You can log in with the new password.
            </Alert>
            <Button
              type="button"
              onClick={goToLogin}
              variant="primary"
              size="lg"
              className="rounded-2xl px-5 py-4 text-lg font-bold shadow-[var(--tms-shadow-subtle)]"
            >
              Go to login
            </Button>
          </div>
        ) : (
          <form className="grid flex-1 content-start gap-5" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-left">
              <span className="text-lg font-medium text-[var(--tms-text-muted)]">
                New password
              </span>
              <PasswordInput
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                size="lg"
                className="auth-input rounded-2xl px-5 py-4 text-lg"
                placeholder="Create a new password"
                autoComplete="new-password"
              />
              <span className="text-sm text-[var(--tms-text-muted)]">
                At least 8 characters.
              </span>
            </label>

            <label className="grid gap-2 text-left">
              <span className="text-lg font-medium text-[var(--tms-text-muted)]">
                Confirm password
              </span>
              <PasswordInput
                name="confirmPassword"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                size="lg"
                className="auth-input rounded-2xl px-5 py-4 text-lg"
                placeholder="Repeat the new password"
                autoComplete="new-password"
              />
            </label>

            {errorMessage ? (
              <Alert variant="danger">
                {errorMessage}
              </Alert>
            ) : null}

            <Button
              type="submit"
              disabled={isSubmitting || !token}
              variant="primary"
              size="lg"
              className="mt-auto rounded-2xl px-5 py-4 text-lg font-bold shadow-[var(--tms-shadow-subtle)]"
            >
              {isSubmitting ? 'Saving password...' : 'Save new password'}
            </Button>

            <p className="pt-2 text-center text-lg text-[var(--tms-text-muted)]">
              Need a new link?{' '}
              <Link
                to="/forgot-password"
                className="font-semibold text-[var(--tms-primary)] no-underline"
              >
                Request reset
              </Link>
              .
            </p>
          </form>
        )}
      </Panel>
    </main>
  )
}

import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Panel } from '../components/ui/Panel'
import { getCurrentUser } from '../features/auth/server'
import { requestPasswordReset } from '../lib/auth-client'

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
    <main className="auth-page page-wrap px-4 py-8 sm:py-12">
      <Panel className="auth-card rise-in mx-auto flex min-h-[30rem] w-full max-w-[35rem] flex-col p-8 sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="display-title mb-0 text-5xl font-extrabold tracking-tight text-[var(--tms-text)]">
            Reset password
          </h1>
        </div>

        {submittedEmail ? (
          <div className="grid flex-1 content-start gap-5 text-center">
            <Alert variant="success" className="px-5 py-4 text-left">
              If an account exists for{' '}
              <span className="font-semibold">{submittedEmail}</span>, we sent a
              password reset link.
            </Alert>
            <Link
              to="/login"
              className="tms-button tms-button-primary justify-center rounded-2xl px-5 py-4 text-lg font-bold no-underline shadow-[var(--tms-shadow-subtle)]"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form className="grid flex-1 content-start gap-5" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-left">
              <span className="text-lg font-medium text-[var(--tms-text-muted)]">
                Email
              </span>
              <Input
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                size="lg"
                className="auth-input rounded-2xl px-5 py-4 text-lg"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            {errorMessage ? (
              <Alert variant="danger">
                {errorMessage}
              </Alert>
            ) : null}

            <Button
              type="submit"
              disabled={isSubmitting}
              variant="primary"
              size="lg"
              className="mt-auto rounded-2xl px-5 py-4 text-lg font-bold shadow-[var(--tms-shadow-subtle)]"
            >
              {isSubmitting ? 'Sending reset link...' : 'Send reset link'}
            </Button>

            <p className="pt-2 text-center text-lg text-[var(--tms-text-muted)]">
              Remembered it?{' '}
              <Link
                to="/login"
                className="font-semibold text-[var(--tms-primary)] no-underline"
              >
                Log in
              </Link>
              .
            </p>
          </form>
        )}
      </Panel>
    </main>
  )
}

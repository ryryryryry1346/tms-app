import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
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
      <section className="auth-card rise-in mx-auto flex min-h-[32rem] w-full max-w-[35rem] flex-col rounded-[2rem] border border-[var(--auth-card-line)] bg-[var(--auth-card-bg)] p-8 shadow-[0_24px_70px_rgba(28,44,90,0.08)] sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="display-title mb-0 text-5xl font-extrabold tracking-tight text-[var(--brand-strong)]">
            New password
          </h1>
        </div>

        {isComplete ? (
          <div className="grid flex-1 content-start gap-5 text-center">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-left text-sm text-emerald-950">
              Your password has been reset. You can log in with the new password.
            </div>
            <button
              type="button"
              onClick={goToLogin}
              className="rounded-2xl bg-[var(--brand)] px-5 py-4 text-lg font-bold text-white shadow-[0_16px_34px_rgba(34,145,233,0.24)]"
            >
              Go to login
            </button>
          </div>
        ) : (
          <form className="grid flex-1 content-start gap-5" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-left">
              <span className="text-lg font-medium text-[var(--auth-label)]">
                New password
              </span>
              <input
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                className="auth-input rounded-2xl border border-[var(--auth-input-line)] bg-[var(--auth-input-bg)] px-5 py-4 text-lg outline-none transition focus:border-[var(--brand)]"
                placeholder="Create a new password"
                autoComplete="new-password"
              />
            </label>

            <label className="grid gap-2 text-left">
              <span className="text-lg font-medium text-[var(--auth-label)]">
                Confirm password
              </span>
              <input
                name="confirmPassword"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                className="auth-input rounded-2xl border border-[var(--auth-input-line)] bg-[var(--auth-input-bg)] px-5 py-4 text-lg outline-none transition focus:border-[var(--brand)]"
                placeholder="Repeat the new password"
                autoComplete="new-password"
              />
            </label>

            {errorMessage ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || !token}
              className="mt-auto rounded-2xl bg-[var(--brand)] px-5 py-4 text-lg font-bold text-white shadow-[0_16px_34px_rgba(34,145,233,0.24)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isSubmitting ? 'Saving password...' : 'Save new password'}
            </button>

            <p className="pt-2 text-center text-lg text-[var(--sea-ink-soft)]">
              Need a new link?{' '}
              <a
                href="/forgot-password"
                className="font-semibold text-[var(--brand)] no-underline"
              >
                Request reset
              </a>
              .
            </p>
          </form>
        )}
      </section>
    </main>
  )
}

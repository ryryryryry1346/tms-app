import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Panel } from '../components/ui/Panel'
import { getCurrentUser } from '../features/auth/server'
import { signUp } from '../lib/auth-client'

export const Route = createFileRoute('/register')({
  loader: async () => {
    const user = await getCurrentUser()

    if (user) {
      throw redirect({
        to: '/',
      })
    }

    return null
  },
  component: RegisterPage,
})

function RegisterPage() {
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
    <main className="auth-page page-wrap px-4 py-8 sm:py-12">
      <Panel className="auth-card rise-in mx-auto flex min-h-[35rem] w-full max-w-[35rem] flex-col p-8 sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="display-title mb-0 text-5xl font-extrabold tracking-tight text-[var(--brand-strong)]">
            {submittedEmail ? 'Check your email' : 'Register'}
          </h1>
        </div>

        {submittedEmail ? (
          <div className="grid flex-1 content-start gap-5 text-center">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-left text-sm text-emerald-950">
              We sent a verification link to{' '}
              <span className="font-semibold">{submittedEmail}</span>. Open it
              to confirm your email before logging in.
            </div>
            <a
              href="/login"
              className="tms-button tms-button-primary justify-center rounded-2xl px-5 py-4 text-lg font-bold no-underline shadow-[0_16px_34px_rgba(34,145,233,0.24)]"
            >
              Go to login
            </a>
          </div>
        ) : (
          <form className="grid flex-1 content-start gap-5" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-left">
              <span className="text-lg font-medium text-[var(--auth-label)]">
                Name
              </span>
              <Input
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                size="lg"
                className="auth-input rounded-2xl px-5 py-4 text-lg"
                placeholder="Your name"
                autoComplete="name"
              />
            </label>

            <label className="grid gap-2 text-left">
              <span className="text-lg font-medium text-[var(--auth-label)]">
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

            <label className="grid gap-2 text-left">
              <span className="text-lg font-medium text-[var(--auth-label)]">
                Password
              </span>
              <Input
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                size="lg"
                className="auth-input rounded-2xl px-5 py-4 text-lg"
                placeholder="Create a password"
                autoComplete="new-password"
              />
            </label>

            {errorMessage ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {errorMessage}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={isSubmitting}
              variant="primary"
              size="lg"
              className="mt-auto rounded-2xl px-5 py-4 text-lg font-bold shadow-[0_16px_34px_rgba(34,145,233,0.24)]"
            >
              {isSubmitting ? 'Sending verification...' : 'Create account'}
            </Button>

            <p className="pt-2 text-center text-lg text-[var(--sea-ink-soft)]">
              Already have an account?{' '}
              <a
                href="/login"
                className="font-semibold text-[var(--brand)] no-underline"
              >
                Log in
              </a>
              .
            </p>
          </form>
        )}
      </Panel>
    </main>
  )
}

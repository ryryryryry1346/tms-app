import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { PasswordInput } from '../components/ui/PasswordInput'
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
          <h1 className="display-title mb-0 text-5xl font-extrabold tracking-tight text-[var(--tms-text)]">
            {submittedEmail ? 'Check your email' : 'Register'}
          </h1>
        </div>

        {submittedEmail ? (
          <div className="grid flex-1 content-start gap-5 text-center">
            <Alert variant="success" className="px-5 py-4 text-left">
              We sent a verification link to{' '}
              <span className="font-semibold">{submittedEmail}</span>. Open it
              to confirm your email before logging in.
            </Alert>
            <Link
              to="/login"
              className="tms-button tms-button-primary justify-center rounded-2xl px-5 py-4 text-lg font-bold no-underline shadow-[var(--tms-shadow-subtle)]"
            >
              Go to login
            </Link>
          </div>
        ) : (
          <form className="grid flex-1 content-start gap-5" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-left">
              <span className="text-lg font-medium text-[var(--tms-text-muted)]">
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

            <label className="grid gap-2 text-left">
              <span className="text-lg font-medium text-[var(--tms-text-muted)]">
                Password
              </span>
              <PasswordInput
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                size="lg"
                className="auth-input rounded-2xl px-5 py-4 text-lg"
                placeholder="Create a password"
                autoComplete="new-password"
              />
              <span className="text-sm text-[var(--tms-text-muted)]">
                At least 8 characters.
              </span>
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
              {isSubmitting ? 'Sending verification...' : 'Create account'}
            </Button>

            <p className="pt-2 text-center text-lg text-[var(--tms-text-muted)]">
              Already have an account?{' '}
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

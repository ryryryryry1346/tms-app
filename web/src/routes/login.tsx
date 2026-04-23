import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { getCurrentUser, loginUser } from '../features/auth/server'

export const Route = createFileRoute('/login')({
  loader: async () => {
    const user = await getCurrentUser()

    if (user) {
      throw redirect({
        to: '/',
      })
    }

    return null
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
      const submittedUsername = String(formData.get('username') ?? '').trim()
      const submittedPassword = String(formData.get('password') ?? '')

      const result = await loginUser({
        data: {
          username: submittedUsername,
          password: submittedPassword,
        },
      })

      if (!result.ok) {
        setErrorMessage('Invalid credentials.')
        return
      }

      await navigate({
        to: '/',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page page-wrap px-4 py-8 sm:py-12">
      <section className="auth-card rise-in mx-auto flex min-h-[35rem] w-full max-w-[35rem] flex-col rounded-[2rem] border border-[var(--auth-card-line)] bg-[var(--auth-card-bg)] p-8 shadow-[0_24px_70px_rgba(28,44,90,0.08)] sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="display-title mb-0 text-5xl font-extrabold tracking-tight text-[var(--brand-strong)]">
            Login
          </h1>
        </div>

        <form className="grid flex-1 content-start gap-5" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-left">
            <span className="text-lg font-medium text-[var(--auth-label)]">
              Email or username
            </span>
            <input
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="auth-input rounded-2xl border border-[var(--auth-input-line)] bg-[var(--auth-input-bg)] px-5 py-4 text-lg outline-none transition focus:border-[var(--brand)]"
              placeholder="Enter your email or username"
            />
          </label>

          <label className="grid gap-2 text-left">
            <span className="text-lg font-medium text-[var(--auth-label)]">
              Password
            </span>
            <input
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="auth-input rounded-2xl border border-[var(--auth-input-line)] bg-[var(--auth-input-bg)] px-5 py-4 text-lg outline-none transition focus:border-[var(--brand)]"
              placeholder="Enter your password"
            />
          </label>

          <input
            type="hidden"
            name="_auth_context"
            value="login"
          />

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-auto rounded-2xl bg-[var(--brand)] px-5 py-4 text-lg font-bold text-white shadow-[0_16px_34px_rgba(34,145,233,0.24)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isSubmitting ? 'Logging in...' : 'Log in'}
          </button>

          <p className="pt-2 text-center text-lg text-[var(--sea-ink-soft)]">
            Don&apos;t have an account?{' '}
            <a href="/register" className="font-semibold text-[var(--brand)] no-underline">
              Create one now
            </a>
            .
          </p>
        </form>
      </section>
    </main>
  )
}

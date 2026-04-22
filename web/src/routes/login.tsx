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
    <main className="page-wrap px-4 py-12">
      <section className="mx-auto max-w-md rounded-[2rem] border border-[var(--line)] bg-white/80 p-6 shadow-[0_18px_40px_rgba(23,58,64,0.08)] sm:p-8">
        <p className="island-kicker mb-2">Login</p>
        <h1 className="display-title mb-4 text-4xl font-bold text-[var(--sea-ink)]">
          Sign in
        </h1>

        <form className="grid gap-3" onSubmit={handleSubmit}>
          <input
            name="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="rounded-xl border border-[var(--line)] bg-white/85 px-4 py-3 text-base outline-none transition focus:border-[var(--lagoon-deep)]"
            placeholder="Username"
          />
          <input
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            className="rounded-xl border border-[var(--line)] bg-white/85 px-4 py-3 text-base outline-none transition focus:border-[var(--lagoon-deep)]"
            placeholder="Password"
          />

          {errorMessage ? (
            <div className="rounded-xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.18)] px-4 py-3 text-sm font-semibold text-[var(--lagoon-deep)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  )
}

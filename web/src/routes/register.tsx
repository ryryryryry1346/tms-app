import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { getCurrentUser, registerUser } from '../features/auth/server'

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
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      await registerUser({
        data: {
          username,
          password,
        },
      })

      await navigate({
        to: '/login',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page-wrap px-4 py-12">
      <section className="mx-auto max-w-md rounded-[2rem] border border-[var(--line)] bg-white/80 p-6 shadow-[0_18px_40px_rgba(23,58,64,0.08)] sm:p-8">
        <p className="island-kicker mb-2">Register</p>
        <h1 className="display-title mb-4 text-4xl font-bold text-[var(--sea-ink)]">
          Create account
        </h1>

        <form className="grid gap-3" onSubmit={handleSubmit}>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="rounded-xl border border-[var(--line)] bg-white/85 px-4 py-3 text-base outline-none transition focus:border-[var(--lagoon-deep)]"
            placeholder="Username"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            className="rounded-xl border border-[var(--line)] bg-white/85 px-4 py-3 text-base outline-none transition focus:border-[var(--lagoon-deep)]"
            placeholder="Password"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl border border-emerald-300 bg-emerald-100 px-4 py-3 text-sm font-semibold text-emerald-900 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isSubmitting ? 'Creating...' : 'Create account'}
          </button>
        </form>
      </section>
    </main>
  )
}

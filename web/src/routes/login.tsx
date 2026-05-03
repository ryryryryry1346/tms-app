import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { getCurrentUser } from '../features/auth/server'
import { sendVerificationEmail, signIn } from '../lib/auth-client'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    redirectTo: z.string().optional(),
  }),
  loader: async ({ context }) => {
    const user = await getCurrentUser()
    const redirectTo = getSafeRedirectTo(context.location.search.redirectTo)

    if (user) {
      throw redirect({
        href: redirectTo,
      })
    }

    return null
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const router = useRouter()
  const search = Route.useSearch()
  const redirectTo = getSafeRedirectTo(search.redirectTo)
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
      <section className="auth-card rise-in mx-auto flex min-h-[35rem] w-full max-w-[35rem] flex-col rounded-[2rem] border border-[var(--auth-card-line)] bg-[var(--auth-card-bg)] p-8 shadow-[0_24px_70px_rgba(28,44,90,0.08)] sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="display-title mb-0 text-5xl font-extrabold tracking-tight text-[var(--brand-strong)]">
            Login
          </h1>
        </div>

        <form className="grid flex-1 content-start gap-5" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-left">
            <span className="text-lg font-medium text-[var(--auth-label)]">
              Email
            </span>
            <input
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              className="auth-input rounded-2xl border border-[var(--auth-input-line)] bg-[var(--auth-input-bg)] px-5 py-4 text-lg outline-none transition focus:border-[var(--brand)]"
              placeholder="you@example.com"
              autoComplete="email"
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
              autoComplete="current-password"
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

          {unverifiedEmail ? (
            <div className="grid gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
              <div>
                <p className="m-0 font-semibold">Verify your email to continue.</p>
                <p className="m-0 mt-1">
                  We sent a verification link to{' '}
                  <span className="font-semibold">{unverifiedEmail}</span>. If it
                  expired or did not arrive, send a new one.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-fit rounded-xl border border-amber-300 bg-white px-4 py-2 font-semibold text-amber-950 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isResending ? 'Sending...' : 'Send verification again'}
              </button>
              {resendMessage ? (
                <p className="m-0 text-emerald-800">{resendMessage}</p>
              ) : null}
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
            <a
              href="/forgot-password"
              className="font-semibold text-[var(--brand)] no-underline"
            >
              Forgot password?
            </a>
          </p>

          <p className="text-center text-lg text-[var(--sea-ink-soft)]">
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
      !decoded.startsWith('/api/auth')
    ) {
      return decoded
    }
  } catch {
    return '/'
  }

  return '/'
}

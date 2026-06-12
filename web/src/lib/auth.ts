import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { Resend } from 'resend'
import { getDb } from '../db/client'
import { account, session, user, verification } from '../db/schema'

const localFallbackSecret =
  'local-development-only-better-auth-secret-change-before-production'

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

function getAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET

  if (secret && secret.length >= 32) {
    return secret
  }

  if (isProduction()) {
    throw new Error(
      'BETTER_AUTH_SECRET is required in production and must be at least 32 characters. ' +
        'Generate one with: openssl rand -base64 32',
    )
  }

  return secret ?? localFallbackSecret
}

function getAuthBaseUrl(): string {
  const baseUrl = process.env.BETTER_AUTH_URL

  if (baseUrl) {
    return baseUrl
  }

  if (isProduction()) {
    throw new Error(
      'BETTER_AUTH_URL is required in production (used to build verification and password-reset links).',
    )
  }

  return 'http://localhost:3000'
}

function getResendFrom(): string {
  return process.env.RESEND_FROM ?? 'TMS <no-reply@example.com>'
}

async function sendVerificationEmail({
  email,
  url,
}: {
  email: string
  url: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is required to send verification emails.')
  }

  const resend = new Resend(apiKey)
  await resend.emails.send({
    from: getResendFrom(),
    to: email,
    subject: 'Verify your TMS account',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h1 style="font-size: 20px;">Verify your TMS account</h1>
        <p>Confirm your email address to finish creating your TMS account.</p>
        <p><a href="${url}">Verify email</a></p>
        <p>If you did not create this account, you can ignore this email.</p>
      </div>
    `,
  })
}

async function sendResetPasswordEmail({
  email,
  url,
}: {
  email: string
  url: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is required to send password reset emails.')
  }

  const resend = new Resend(apiKey)
  await resend.emails.send({
    from: getResendFrom(),
    to: email,
    subject: 'Reset your TMS password',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h1 style="font-size: 20px;">Reset your TMS password</h1>
        <p>Use this link to choose a new password for your TMS account.</p>
        <p><a href="${url}">Reset password</a></p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  })
}

export const auth = betterAuth({
  baseURL: getAuthBaseUrl(),
  secret: getAuthSecret(),
  database: drizzleAdapter(getDb(), {
    provider: 'mysql',
    schema: {
      user,
      session,
      account,
      verification,
    },
    camelCase: true,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user: authUser, url }) => {
      await sendResetPasswordEmail({
        email: authUser.email,
        url,
      })
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: false,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user: authUser, url }) => {
      await sendVerificationEmail({
        email: authUser.email,
        url,
      })
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 10 },
      '/sign-up/email': { window: 60, max: 5 },
      '/forget-password': { window: 60, max: 5 },
      '/reset-password': { window: 60, max: 10 },
    },
  },
  plugins: [tanstackStartCookies()],
})

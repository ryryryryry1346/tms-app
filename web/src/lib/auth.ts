import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { Resend } from 'resend'
import { getDb } from '../db/client'
import { account, session, user, verification } from '../db/schema'

const localFallbackSecret =
  'local-development-only-better-auth-secret-change-before-production'

function getAuthSecret(): string {
  return process.env.BETTER_AUTH_SECRET ?? localFallbackSecret
}

function getAuthBaseUrl(): string {
  return process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'
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
  plugins: [tanstackStartCookies()],
})

import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { APIError } from 'better-auth/api'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { getDb } from '../db/client'
import { account, session, user, verification } from '../db/schema'
import { sendMail } from './mail.server'
import {
  SLACK_WRONG_WORKSPACE_ERROR,
  isSlackTeamAllowed,
  mapSlackProfileToUser,
  readSlackAuthConfig,
  type SlackAuthConfig,
  type SlackProfile,
} from './slackAuth'

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

/** Slack sign-in settings, or null when Slack is not configured. */
export const slackAuthConfig: SlackAuthConfig | null = readSlackAuthConfig(
  process.env,
  isProduction(),
)

/**
 * "Sign in with Slack" (OpenID Connect). The user info is fetched here instead
 * of by Better Auth's default so the workspace can be checked on every
 * sign-in: a Slack account from another workspace is sent back to the login
 * page before it can be linked or create a TMS account.
 */
function buildSocialProviders(baseUrl: string) {
  const config = slackAuthConfig

  if (!config) {
    return {}
  }

  return {
    slack: {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      disableSignUp: !config.allowSignUp,
      async getUserInfo(token: { accessToken?: string }) {
        if (!token.accessToken) {
          return null
        }

        const response = await fetch(
          'https://slack.com/api/openid.connect.userInfo',
          { headers: { authorization: `Bearer ${token.accessToken}` } },
        )

        if (!response.ok) {
          return null
        }

        const profile = (await response.json()) as SlackProfile

        if (profile.ok !== true) {
          return null
        }

        if (!isSlackTeamAllowed(profile, config.teamId)) {
          // A FOUND APIError is Better Auth's redirect (same as c.redirect).
          throw new APIError('FOUND', undefined, {
            Location: new URL(
              `/login?error=${SLACK_WRONG_WORKSPACE_ERROR}`,
              baseUrl,
            ).toString(),
          })
        }

        const user = mapSlackProfileToUser(profile)

        return user ? { user, data: profile } : null
      },
    },
  }
}

async function sendVerificationEmail({
  email,
  url,
}: {
  email: string
  url: string
}): Promise<void> {
  await sendMail({
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
    text: [
      'Verify your TMS account',
      '',
      'Confirm your email address to finish creating your TMS account:',
      url,
      '',
      'If you did not create this account, you can ignore this email.',
    ].join('\n'),
  })
}

async function sendResetPasswordEmail({
  email,
  url,
}: {
  email: string
  url: string
}): Promise<void> {
  await sendMail({
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
    text: [
      'Reset your TMS password',
      '',
      'Use this link to choose a new password for your TMS account:',
      url,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
  })
}

const authBaseUrl = getAuthBaseUrl()

export const auth = betterAuth({
  baseURL: authBaseUrl,
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
  socialProviders: buildSocialProviders(authBaseUrl),
  account: {
    // Slack tokens are not used after sign-in, but never store them in clear text.
    encryptOAuthTokens: true,
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
      '/sign-in/social': { window: 60, max: 10 },
    },
  },
  plugins: [tanstackStartCookies()],
})

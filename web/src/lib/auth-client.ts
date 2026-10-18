import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient()

export const {
  linkSocial,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  signIn,
  signOut,
  signUp,
  useSession,
} = authClient

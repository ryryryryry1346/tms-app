import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient()

export const {
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  signIn,
  signOut,
  signUp,
  useSession,
} = authClient

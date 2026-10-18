/**
 * Pure helpers for "Sign in with Slack" (no I/O), shared by the auth server
 * config and the UI so they can be unit-tested directly.
 */

export type SlackAuthConfig = {
  clientId: string
  clientSecret: string
  /** Slack workspace (team) id, e.g. `T01AB2CD3EF`. Only this workspace may sign in. */
  teamId: string | null
  /** Optional display name of the workspace, shown under the button. */
  workspaceName: string | null
  /** Create TMS accounts for new people from the workspace. */
  allowSignUp: boolean
}

type Env = Record<string, string | undefined>

const TEAM_ID_PATTERN = /^[TE][A-Z0-9]{2,30}$/

function readFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') {
    return fallback
  }

  return !['0', 'false', 'no', 'off'].includes(value.trim().toLowerCase())
}

/**
 * Reads the Slack sign-in settings from the environment. Returns null when
 * Slack is not configured (the button is then hidden). Throws on settings
 * that would be unsafe: in production, open sign-up without a workspace
 * restriction would let any Slack user in the world create an account.
 */
export function readSlackAuthConfig(
  env: Env,
  isProduction: boolean,
): SlackAuthConfig | null {
  const clientId = env.SLACK_CLIENT_ID?.trim() ?? ''
  const clientSecret = env.SLACK_CLIENT_SECRET?.trim() ?? ''

  if (!clientId && !clientSecret) {
    return null
  }

  if (!clientId || !clientSecret) {
    throw new Error(
      'Slack sign-in needs both SLACK_CLIENT_ID and SLACK_CLIENT_SECRET.',
    )
  }

  const rawTeamId = env.SLACK_TEAM_ID?.trim() ?? ''

  if (rawTeamId && !TEAM_ID_PATTERN.test(rawTeamId)) {
    throw new Error(
      'SLACK_TEAM_ID must be a Slack workspace id like T01AB2CD3EF.',
    )
  }

  const teamId = rawTeamId || null
  const allowSignUp = readFlag(env.SLACK_ALLOW_SIGN_UP, true)

  if (isProduction && allowSignUp && !teamId) {
    throw new Error(
      'SLACK_TEAM_ID is required in production while SLACK_ALLOW_SIGN_UP is on; otherwise any Slack user could create an account.',
    )
  }

  return {
    clientId,
    clientSecret,
    teamId,
    workspaceName: env.SLACK_WORKSPACE_NAME?.trim() || null,
    allowSignUp,
  }
}

export type SlackProfile = Record<string, unknown>

export function getSlackTeamId(profile: SlackProfile): string | null {
  const value = profile['https://slack.com/team_id']
  return typeof value === 'string' && value ? value : null
}

/** True when the signed-in Slack user belongs to the allowed workspace. */
export function isSlackTeamAllowed(
  profile: SlackProfile,
  teamId: string | null,
): boolean {
  if (!teamId) {
    return true
  }

  return getSlackTeamId(profile) === teamId
}

/** Maps the `openid.connect.userInfo` response to a Better Auth user. */
export function mapSlackProfileToUser(profile: SlackProfile): {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | undefined
} | null {
  const id = profile['https://slack.com/user_id'] ?? profile.sub
  const email = profile.email

  if (typeof id !== 'string' || !id || typeof email !== 'string' || !email) {
    return null
  }

  const name = typeof profile.name === 'string' ? profile.name : ''
  const picture =
    typeof profile.picture === 'string' && profile.picture
      ? profile.picture
      : typeof profile['https://slack.com/user_image_512'] === 'string'
        ? (profile['https://slack.com/user_image_512'] as string)
        : undefined

  return {
    id,
    name: name || email.split('@')[0],
    email,
    emailVerified: profile.email_verified === true,
    image: picture,
  }
}

export const SLACK_WRONG_WORKSPACE_ERROR = 'slack_wrong_workspace'

/**
 * Turns an OAuth error code from `?error=` into an English message (the UI
 * passes it through t()). Unknown codes get a generic message.
 */
export function describeSlackSignInError(code: string): string {
  switch (code) {
    case SLACK_WRONG_WORKSPACE_ERROR:
      return 'This Slack account is not in the allowed workspace. Switch to the right workspace in Slack and try again.'
    case 'signup_disabled':
      return 'There is no TMS account for this email yet. Ask an administrator or create an account with email.'
    case 'account_not_linked':
      return 'An account with this email already exists. Log in with your password and connect Slack in Account → Security.'
    case 'access_denied':
      return 'Slack sign-in was cancelled.'
    case 'email_not_found':
      return 'Slack did not share an email address for this account.'
    case 'account_already_linked_to_different_user':
      return 'This Slack account is already connected to another TMS account.'
    case "email_doesn't_match":
      return 'The Slack account uses a different email than your TMS account.'
    default:
      return 'Could not sign in with Slack. Try again.'
  }
}

export type SignInMethods = {
  password: boolean
  slack: boolean
}

/** A method can be removed only while another one remains. */
export function canDisconnectSlack(methods: SignInMethods): boolean {
  return methods.slack && methods.password
}

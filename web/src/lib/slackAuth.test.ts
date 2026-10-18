import { describe, expect, it } from 'vitest'
import {
  canDisconnectSlack,
  describeSlackSignInError,
  isSlackTeamAllowed,
  mapSlackProfileToUser,
  readSlackAuthConfig,
} from './slackAuth'

describe('readSlackAuthConfig', () => {
  it('is off without credentials', () => {
    expect(readSlackAuthConfig({}, true)).toBeNull()
  })

  it('reads a full production config', () => {
    expect(
      readSlackAuthConfig(
        {
          SLACK_CLIENT_ID: ' 123.456 ',
          SLACK_CLIENT_SECRET: 'secret',
          SLACK_TEAM_ID: 'T01AB2CD3EF',
          SLACK_WORKSPACE_NAME: 'Acme',
        },
        true,
      ),
    ).toEqual({
      clientId: '123.456',
      clientSecret: 'secret',
      teamId: 'T01AB2CD3EF',
      workspaceName: 'Acme',
      allowSignUp: true,
    })
  })

  it('rejects unsafe or broken settings', () => {
    expect(() =>
      readSlackAuthConfig({ SLACK_CLIENT_ID: 'x' }, false),
    ).toThrow('SLACK_CLIENT_SECRET')
    expect(() =>
      readSlackAuthConfig(
        { SLACK_CLIENT_ID: 'x', SLACK_CLIENT_SECRET: 'y', SLACK_TEAM_ID: 'acme' },
        false,
      ),
    ).toThrow('SLACK_TEAM_ID')
    expect(() =>
      readSlackAuthConfig({ SLACK_CLIENT_ID: 'x', SLACK_CLIENT_SECRET: 'y' }, true),
    ).toThrow('required in production')
  })

  it('allows a production config without a team when sign-up is off', () => {
    const config = readSlackAuthConfig(
      { SLACK_CLIENT_ID: 'x', SLACK_CLIENT_SECRET: 'y', SLACK_ALLOW_SIGN_UP: 'false' },
      true,
    )

    expect(config?.allowSignUp).toBe(false)
    expect(config?.teamId).toBeNull()
  })
})

describe('workspace check', () => {
  const profile = { 'https://slack.com/team_id': 'T01AB2CD3EF' }

  it('accepts the configured workspace only', () => {
    expect(isSlackTeamAllowed(profile, 'T01AB2CD3EF')).toBe(true)
    expect(isSlackTeamAllowed(profile, 'T99999999')).toBe(false)
    expect(isSlackTeamAllowed({}, 'T01AB2CD3EF')).toBe(false)
    expect(isSlackTeamAllowed({}, null)).toBe(true)
  })
})

describe('mapSlackProfileToUser', () => {
  it('maps the userInfo response', () => {
    expect(
      mapSlackProfileToUser({
        sub: 'U1',
        'https://slack.com/user_id': 'U0R7JM',
        email: 'anna@company.com',
        email_verified: true,
        name: 'Anna K',
        picture: 'https://example.com/a.png',
      }),
    ).toEqual({
      id: 'U0R7JM',
      name: 'Anna K',
      email: 'anna@company.com',
      emailVerified: true,
      image: 'https://example.com/a.png',
    })
  })

  it('falls back sensibly and rejects profiles without email', () => {
    expect(
      mapSlackProfileToUser({ sub: 'U2', email: 'igor@company.com' }),
    ).toEqual({
      id: 'U2',
      name: 'igor',
      email: 'igor@company.com',
      emailVerified: false,
      image: undefined,
    })
    expect(mapSlackProfileToUser({ sub: 'U3' })).toBeNull()
  })
})

describe('misc', () => {
  it('describes known and unknown errors', () => {
    expect(describeSlackSignInError('slack_wrong_workspace')).toContain(
      'workspace',
    )
    expect(describeSlackSignInError('whatever')).toBe(
      'Could not sign in with Slack. Try again.',
    )
  })

  it('never removes the last sign-in method', () => {
    expect(canDisconnectSlack({ slack: true, password: true })).toBe(true)
    expect(canDisconnectSlack({ slack: true, password: false })).toBe(false)
    expect(canDisconnectSlack({ slack: false, password: true })).toBe(false)
  })
})

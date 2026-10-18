import { useState } from 'react'
import { signIn } from '../../lib/auth-client'
import { useT } from '../../lib/i18n'

const SLACK_LOGO_SRC = '/integrations/slack.png'

type SlackSignInButtonProps = {
  /** Where to land after a successful sign-in (an internal path). */
  callbackURL: string
  label?: string
}

/** The main action of the sign-in pages: "Continue with Slack". */
export function SlackSignInButton({ callbackURL, label }: SlackSignInButtonProps) {
  const t = useT()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleClick(): Promise<void> {
    setErrorMessage(null)
    setIsRedirecting(true)

    try {
      const result = await signIn.social({
        provider: 'slack',
        callbackURL,
        newUserCallbackURL: callbackURL,
        errorCallbackURL: '/login',
      })

      if (result.error) {
        setErrorMessage(t('Could not sign in with Slack. Try again.'))
        setIsRedirecting(false)
      }
    } catch {
      setErrorMessage(t('Could not sign in with Slack. Try again.'))
      setIsRedirecting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="auth-min__button auth-min__button--primary"
        onClick={handleClick}
        disabled={isRedirecting}
      >
        <span className="auth-min__slack-tile" aria-hidden="true">
          <img src={SLACK_LOGO_SRC} alt="" />
        </span>
        {isRedirecting
          ? t('Redirecting to Slack...')
          : (label ?? t('Continue with Slack'))}
      </button>
      {errorMessage ? (
        <p className="auth-min__error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </>
  )
}

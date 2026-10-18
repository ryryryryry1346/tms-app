import { useState } from 'react'
import { signIn } from '../../lib/auth-client'
import { useT } from '../../lib/i18n'
import { Button } from '../ui/Button'

const SLACK_LOGO_SRC = '/integrations/slack.png'

type SlackSignInButtonProps = {
  /** Where to land after a successful sign-in (an internal path). */
  callbackURL: string
  workspaceName: string | null
  label?: string
}

/**
 * "Continue with Slack" plus the "or use email" divider that separates it from
 * the email form below.
 */
export function SlackSignInButton({
  callbackURL,
  workspaceName,
  label,
}: SlackSignInButtonProps) {
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
    <div className="slack-sign-in">
      <Button
        type="button"
        size="lg"
        variant="secondary"
        className="slack-sign-in__button rounded-2xl px-5 py-4 text-lg font-semibold"
        onClick={handleClick}
        disabled={isRedirecting}
      >
        <img
          src={SLACK_LOGO_SRC}
          alt=""
          aria-hidden="true"
          className="slack-sign-in__logo"
          onError={(event) => {
            // The official mark is added to public/integrations by hand;
            // until then the button is text only.
            event.currentTarget.style.display = 'none'
          }}
        />
        {isRedirecting
          ? t('Redirecting to Slack...')
          : (label ?? t('Continue with Slack'))}
      </Button>
      {workspaceName ? (
        <p className="slack-sign-in__hint">
          {t('Workspace: {name}', { name: workspaceName })}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="slack-sign-in__error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <div className="slack-sign-in__divider" role="separator">
        <span>{t('or use email')}</span>
      </div>
    </div>
  )
}

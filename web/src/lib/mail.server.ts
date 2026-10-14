import { logger } from './logger'

/**
 * Outgoing email (verification, password reset).
 *
 * MAIL_DRIVER chooses how mail is sent:
 * - smtp   -> any SMTP server, e.g. the company mail server (SMTP_* below)
 * - resend -> Resend API (RESEND_API_KEY)
 * - log    -> nothing is sent; the message (including its link) is written
 *             to the server log. Only for a closed setup without a mail
 *             server, where an admin passes the link on by hand.
 * - not set -> resend if RESEND_API_KEY is set, smtp if SMTP_HOST is set.
 *
 * Sender: MAIL_FROM (falls back to RESEND_FROM).
 */

export type MailMessage = {
  to: string
  subject: string
  html: string
  text: string
}

type MailDriver = 'smtp' | 'resend' | 'log'

function getMailDriver(): MailDriver {
  const configured = process.env.MAIL_DRIVER?.trim().toLowerCase()

  if (configured === 'smtp' || configured === 'resend' || configured === 'log') {
    return configured
  }

  if (configured) {
    throw new Error(
      `Unknown MAIL_DRIVER "${configured}". Use "smtp", "resend" or "log".`,
    )
  }

  if (process.env.RESEND_API_KEY) {
    return 'resend'
  }

  if (process.env.SMTP_HOST) {
    return 'smtp'
  }

  throw new Error(
    'Email is not configured. Set MAIL_DRIVER=smtp with SMTP_HOST (company mail server), ' +
      'or RESEND_API_KEY, or MAIL_DRIVER=log.',
  )
}

function getMailFrom(): string {
  return (
    process.env.MAIL_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    'TMS <no-reply@example.com>'
  )
}

function readBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

async function sendWithSmtp(message: MailMessage): Promise<void> {
  const host = process.env.SMTP_HOST?.trim()

  if (!host) {
    throw new Error('SMTP_HOST is required when MAIL_DRIVER=smtp.')
  }

  const port = Number(process.env.SMTP_PORT || 587)

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('SMTP_PORT must be a port number.')
  }

  const user = process.env.SMTP_USER?.trim()
  const password = process.env.SMTP_PASSWORD ?? ''
  // Port 465 = TLS from the start; other ports upgrade with STARTTLS when the
  // server offers it.
  const secure = readBoolean(process.env.SMTP_SECURE) ?? port === 465
  // Set SMTP_TLS_REJECT_UNAUTHORIZED=false only for a mail server with a
  // self-signed / internal certificate that this machine does not trust.
  const rejectUnauthorized =
    readBoolean(process.env.SMTP_TLS_REJECT_UNAUTHORIZED) ?? true

  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass: password } : undefined,
    tls: { rejectUnauthorized },
  })

  await transporter.sendMail({
    from: getMailFrom(),
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  })
}

async function sendWithResend(message: MailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is required when MAIL_DRIVER=resend.')
  }

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)
  const result = await resend.emails.send({
    from: getMailFrom(),
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  })

  if (result.error) {
    throw new Error(`Resend could not send the email: ${result.error.message}`)
  }
}

export async function sendMail(message: MailMessage): Promise<void> {
  const driver = getMailDriver()

  if (driver === 'log') {
    logger.info('Email not sent (MAIL_DRIVER=log)', {
      to: message.to,
      subject: message.subject,
      text: message.text,
    })
    return
  }

  try {
    if (driver === 'smtp') {
      await sendWithSmtp(message)
    } else {
      await sendWithResend(message)
    }
  } catch (error) {
    logger.error('sendMail failed', {
      driver,
      to: message.to,
      subject: message.subject,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

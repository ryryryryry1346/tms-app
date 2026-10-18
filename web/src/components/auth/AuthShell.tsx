import type { ReactNode } from 'react'

/** The TMS mark: a check in a rounded square. */
export function TmsMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      aria-hidden="true"
      className="tms-mark"
    >
      <rect x="1" y="1" width="28" height="28" rx="8" className="tms-mark__box" />
      <path
        d="M9 15.5l4 4 8-9"
        fill="none"
        className="tms-mark__check"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Minimal layout for the sign-in pages: the mark, a title, an optional
 * subtitle and one narrow column of content, centred on a plain page.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
}) {
  return (
    <main className="auth-min">
      <div className="auth-min__column">
        <header className="auth-min__head">
          <TmsMark />
          <div>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </header>
        {children}
      </div>
    </main>
  )
}

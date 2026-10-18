import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import AppShell from '../components/AppShell'
import { ThemeProvider } from '../components/ThemeProvider'
import { getCurrentUser } from '../features/auth/server'
import { getLanguage } from '../features/i18n/server'
import {
  DEFAULT_LANGUAGE,
  I18nProvider,
  readLanguageFromDocument,
} from '../lib/i18n'
import { THEME_INIT_SCRIPT } from '../lib/theme'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  beforeLoad: async () => {
    const [user, language] = await Promise.all([
      getCurrentUser(),
      // On the server the language comes from the request cookie; in the
      // browser it is read straight from document.cookie (no extra request).
      typeof window === 'undefined'
        ? getLanguage()
        : Promise.resolve(readLanguageFromDocument()),
    ])

    return {
      user,
      language,
    }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TMS',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/png',
        href: '/qa-favicon.png',
      },
      {
        rel: 'apple-touch-icon',
        href: '/qa-favicon.png',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const context = Route.useRouteContext()

  return (
    <html lang={context.language ?? DEFAULT_LANGUAGE} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[var(--tms-selection)]">
        <I18nProvider initialLanguage={context.language ?? DEFAULT_LANGUAGE}>
          <ThemeProvider>
            <AppShell user={context.user ?? null}>{children}</AppShell>
          </ThemeProvider>
        </I18nProvider>
        {import.meta.env.DEV ? (
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}

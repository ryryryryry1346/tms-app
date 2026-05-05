import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <p className="island-kicker mb-2">Application status</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--tms-text)] sm:text-5xl">
          TypeScript TMS workspace
        </h1>
        <div className="max-w-3xl space-y-4 text-base leading-8 text-[var(--tms-text-muted)]">
          <p>
            The active application lives in <code>web/</code>. It uses TanStack
            Start, React, TypeScript, MySQL, Drizzle, Better Auth, Cloudinary,
            and a project-local TMS UI kit.
          </p>
          <p>
            The old Flask/Jinja source has been removed from the repository so
            ongoing product work can stay focused on the TypeScript app.
          </p>
          <ul className="m-0 list-disc space-y-2 pl-5">
            <li>Repository, run execution, full case pages, and auth flows are handled by the TypeScript app.</li>
            <li>Rich text editing uses TipTap with media attachment support.</li>
            <li>Better Auth manages email/password registration, verification, login, logout, and password reset.</li>
          </ul>
        </div>
      </section>
    </main>
  )
}

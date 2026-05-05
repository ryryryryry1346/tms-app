import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <p className="island-kicker mb-2">Migration assessment</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--tms-text)] sm:text-5xl">
          What has been migrated so far
        </h1>
        <div className="max-w-3xl space-y-4 text-base leading-8 text-[var(--tms-text-muted)]">
          <p>
            The new application lives in <code>web/</code> and currently
            migrates the verified dashboard slice from the Flask app: listing
            projects, filtering by project, reading section-grouped tests,
            creating a project, creating a test without upload handling,
            reading the dedicated test detail page, restoring image upload for
            create test, creating a run, reading the run detail page, restoring
            the historical <code>/run_test</code> execution contract, and Better
            Auth email/password registration with email verification.
          </p>
          <p>
            MySQL and Drizzle are added explicitly, and the schema mirrors the
            currently observed Python domain model while the auth layer now uses
            Better Auth tables managed through Drizzle.
          </p>
          <ul className="m-0 list-disc space-y-2 pl-5">
            <li>Old Flask code is still present and untouched.</li>
            <li>Create-test image upload is restored against Cloudinary, but broader media behavior beyond the confirmed image flow is still intentionally narrow.</li>
            <li>Run execution now preserves only the confirmed per-test Passed/Failed save flow tied to a run.</li>
            <li>Legacy Flask user rows are no longer used by the TypeScript auth flow; a later cleanup can drop the old table with a dedicated migration.</li>
          </ul>
        </div>
      </section>
    </main>
  )
}

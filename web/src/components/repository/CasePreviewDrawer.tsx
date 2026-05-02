import { Link } from '@tanstack/react-router'
import { RichTextEditor } from '../RichTextEditor'

type PreviewCase = {
  id: number
  title: string
  steps: string | null
  expected: string | null
  status: string | null
  priority: string | null
  caseType: string | null
}

type PreviewSuite = {
  name: string
} | null

type PreviewActivity = {
  id: number
  summary: string
  actorName: string | null
  action: string
  createdAt: string
}

type CasePreviewDrawerProps = {
  test: PreviewCase
  suite: PreviewSuite
  activities: PreviewActivity[]
  isEditingContent: boolean
  stepsValue: string
  expectedValue: string
  isSavingContent: boolean
  isUploadingMedia: boolean
  isPendingAction: boolean
  onClose: () => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveContent: () => void
  onStepsChange: (value: string) => void
  onExpectedChange: (value: string) => void
  onUploadMedia: (file: File) => Promise<string>
  onRichContentClick: (event: React.MouseEvent<HTMLElement>) => void
  onRestore: () => void
  onArchive: () => void
  formatDateTime: (value: string | null | undefined) => string
}

export function CasePreviewDrawer({
  test,
  suite,
  activities,
  isEditingContent,
  stepsValue,
  expectedValue,
  isSavingContent,
  isUploadingMedia,
  isPendingAction,
  onClose,
  onStartEdit,
  onCancelEdit,
  onSaveContent,
  onStepsChange,
  onExpectedChange,
  onUploadMedia,
  onRichContentClick,
  onRestore,
  onArchive,
  formatDateTime,
}: CasePreviewDrawerProps) {
  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close case preview"
        onClick={onClose}
        className="absolute inset-0 bg-[#16233f]/30"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[560px] flex-col border-l border-[#dbe4f4] bg-white shadow-[0_24px_80px_rgba(31,57,102,0.22)]">
        <div className="border-b border-[#e9eef8] px-6 py-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-[#7f8da9]">
                Case #{test.id}
              </p>
              <h2 className="m-0 mt-2 text-2xl font-bold leading-tight text-[#1b2f5b]">
                {test.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f]"
            >
              Close
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-[#eef6ff] px-2.5 py-1 text-[#506487]">
              {suite?.name ?? 'No suite'}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 ${
                test.status === 'Ready'
                  ? 'bg-emerald-50 text-emerald-700'
                  : test.status === 'Archived'
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
              }`}
            >
              {test.status ?? 'Draft'}
            </span>
            <span className="rounded-full bg-[#f3f5f9] px-2.5 py-1 text-[#60718f]">
              {test.priority ?? 'Medium'}
            </span>
            <span className="rounded-full bg-[#f3f5f9] px-2.5 py-1 text-[#60718f]">
              {test.caseType ?? 'Functional'}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {isEditingContent ? (
            <div className="grid gap-5">
              <RichTextEditor
                label="Steps"
                placeholder="Describe the test steps"
                value={stepsValue}
                onChange={onStepsChange}
                onUploadMedia={onUploadMedia}
                isUploading={isUploadingMedia}
              />
              <RichTextEditor
                label="Expected result"
                placeholder="Describe the expected result"
                value={expectedValue}
                onChange={onExpectedChange}
                onUploadMedia={onUploadMedia}
                isUploading={isUploadingMedia}
              />
            </div>
          ) : (
            <>
              <section className="mb-5">
                <h3 className="m-0 text-sm font-bold uppercase tracking-[0.08em] text-[#7f8da9]">
                  Steps
                </h3>
                <div
                  className="rich-output prose prose-sm mt-3 max-w-none text-[#1b2f5b]"
                  onClick={onRichContentClick}
                  dangerouslySetInnerHTML={{ __html: test.steps || '<p>-</p>' }}
                />
              </section>

              <section>
                <h3 className="m-0 text-sm font-bold uppercase tracking-[0.08em] text-[#7f8da9]">
                  Expected result
                </h3>
                <div
                  className="rich-output prose prose-sm mt-3 max-w-none text-[#1b2f5b]"
                  onClick={onRichContentClick}
                  dangerouslySetInnerHTML={{ __html: test.expected || '<p>-</p>' }}
                />
              </section>

              <section className="mt-6 border-t border-[#e9eef8] pt-5">
                <h3 className="m-0 text-sm font-bold uppercase tracking-[0.08em] text-[#7f8da9]">
                  Activity
                </h3>
                {activities.length === 0 ? (
                  <p className="m-0 mt-3 text-sm text-[#60718f]">
                    No activity recorded yet.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-3">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="rounded-xl border border-[#e9eef8] bg-[#fbfcff] px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-[#1b2f5b]">
                            {activity.summary}
                          </span>
                          <span className="text-xs font-semibold text-[#7f8da9]">
                            {formatDateTime(activity.createdAt)}
                          </span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-[#60718f]">
                          {activity.actorName ?? 'system'} ·{' '}
                          {activity.action.replaceAll('_', ' ')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-[#e9eef8] px-6 py-4">
          {isEditingContent ? (
            <>
              <button
                type="button"
                disabled={isSavingContent || isUploadingMedia}
                onClick={onSaveContent}
                className="rounded-xl border border-[#9dbaf7] bg-white px-3 py-2 text-sm font-semibold text-[#3369d6] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSavingContent ? 'Saving...' : 'Save content'}
              </button>
              <button
                type="button"
                disabled={isSavingContent}
                onClick={onCancelEdit}
                className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f] disabled:cursor-not-allowed disabled:opacity-55"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onStartEdit}
              className="rounded-xl border border-[#9dbaf7] bg-white px-3 py-2 text-sm font-semibold text-[#3369d6]"
            >
              Edit content
            </button>
          )}
          <Link
            to="/edit-test/$testId"
            params={{ testId: test.id.toString() }}
            className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold no-underline text-[#60718f]"
          >
            Full editor
          </Link>
          <Link
            to="/test/$testId"
            params={{ testId: test.id.toString() }}
            className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold no-underline text-[#60718f]"
          >
            Open full page
          </Link>
          {test.status === 'Archived' ? (
            <button
              type="button"
              disabled={isPendingAction}
              onClick={onRestore}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Restore
            </button>
          ) : (
            <button
              type="button"
              disabled={isPendingAction}
              onClick={onArchive}
              className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Archive
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}

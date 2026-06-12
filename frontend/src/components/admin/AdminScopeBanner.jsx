import { APP } from '@/utils/constants.js'

/** Single-hackathon admin shell — no edition picker. */
export function AdminScopeBanner() {
  return (
    <div className="mb-6 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-3 shadow-sm">
      <p className="text-sm font-semibold text-ink-900">{APP.name}</p>
      <p className="mt-0.5 text-xs text-ink-500">Admin dashboard for this hackathon.</p>
    </div>
  )
}

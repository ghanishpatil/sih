/** Human-readable labels for `lifecyclePhase` from the API. */

const PHASE_LABELS = {
  DRAFT: 'Draft',
  REGISTRATION_OPEN: 'Registration open',
  SUBMISSION_OPEN: 'Submissions open',
  SUBMISSION_CLOSED: 'Submissions closed',
  EVALUATION: 'Evaluation',
  RESULTS: 'Results',
  ARCHIVED: 'Archived',
}

export function formatLifecyclePhase(phase) {
  const k = String(phase || '').trim()
  if (!k) return '—'
  return PHASE_LABELS[k] || k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

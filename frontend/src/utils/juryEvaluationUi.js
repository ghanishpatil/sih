/** Maps `/api/judges/assignments` team.myEvaluation rows to UI workflow labels. */
export function deriveJuryEvalUiStatus(myEvaluation) {
  if (!myEvaluation) return 'pending'
  if (myEvaluation.evaluationLocked) return 'locked'
  if (myEvaluation.evaluationStatus === 'submitted') return 'submitted'
  if (myEvaluation.evaluationStatus === 'draft') return 'in-progress'
  return 'pending'
}

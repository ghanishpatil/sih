// ─────────────────────────────────────────────────────────────────────────────
// Jury panels — department-wise judge panels and the averaged team final score.
//
// MODEL
//   An admin builds a PANEL per department, e.g.
//     judgePanels: {
//       "CSE":  { limit: 2, judges: ["uidA", "uidB"] },   // order = Judge 1, Judge 2
//       "AIML": { limit: 1, judges: ["uidC"] }
//     }
//   stored on the event doc. Array order is purely a LABEL (Judge 1 / Judge 2)
//   and display order — it carries no scoring weight.
//
// FINAL SCORE
//   Every judge on the panel scores the team independently (each judge writes
//   their own `evaluations/{judgeId}_{teamId}` doc, so simultaneous scoring is
//   safe). A judge "counts" only once their evaluation is COMPLETE:
//     • two-part phases  → both Part A and Part B submitted
//     • single-rubric    → the evaluation submitted
//   Once EVERY judge on the panel is complete, the team's final score is the
//   plain average of their percentages:  (75 + 50) / 2 = 62.5
//   Until then there is NO final score — callers show "1 of 2 submitted".
//
//   A panel of 1 works with the same rule: the single judge's score is final.
//
// NOTE: the panel is ALSO mirrored onto each judge's `users/{uid}.assignedDepartments`
// so the existing department scoping (`judgeDeptAllows`) keeps working unchanged.
// ─────────────────────────────────────────────────────────────────────────────
import { computePartTotal } from '../utils/evaluationScores.js'

/**
 * Departments a team/judge can belong to — the BACKEND source of truth.
 *
 * Must stay in sync with `DEPARTMENTS` in `frontend/src/utils/constants.js`.
 * A department missing here is silently dropped from jury panels and rejected by
 * `POST /admin/judges/assign-department`, which would leave those teams with no
 * panel and therefore no final score.
 */
export const JURY_DEPARTMENTS = [
  'Cyber Security', 'AIDS', 'AIML', 'CSE', 'Mechanical', 'MCA', 'BCA',
  'Integrated B.Tech', 'Integrated M.Tech', 'BBA', 'BCOM', 'MBA', 'B.SC', 'M.SC',
  // Science & Pharmacy departments
  'Microbiology', 'Chemistry', 'Food Science and Nutrition', 'B.Pharm',
]

export const MAX_PANEL_SIZE = 5
export const DEFAULT_PANEL_LIMIT = 2

export function isValidJuryDepartment(dept) {
  return JURY_DEPARTMENTS.includes(String(dept || '').trim())
}

function clampLimit(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return DEFAULT_PANEL_LIMIT
  return Math.min(MAX_PANEL_SIZE, Math.max(1, Math.floor(v)))
}

/**
 * Normalize the `judgePanels` map read off the event doc. Unknown departments
 * are dropped; judge lists are de-duped and truncated to the panel limit.
 */
export function normalizePanels(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out = {}
  for (const [deptRaw, val] of Object.entries(raw)) {
    const dept = String(deptRaw || '').trim()
    if (!isValidJuryDepartment(dept)) continue
    const limit = clampLimit(val?.limit)
    const judges = Array.isArray(val?.judges)
      ? [...new Set(val.judges.map((v) => String(v || '').trim()).filter(Boolean))].slice(0, limit)
      : []
    out[dept] = { limit, judges }
  }
  return out
}

/** Panel for one department, or null when none is configured. */
export function getPanel(merged, department) {
  const dept = String(department || '').trim()
  if (!dept) return null
  const panels = normalizePanels(merged?.judgePanels)
  return panels[dept] || null
}

/** Every judge uid that appears on any panel. */
export function allPanelJudgeUids(merged) {
  const panels = normalizePanels(merged?.judgePanels)
  const set = new Set()
  for (const p of Object.values(panels)) for (const uid of p.judges) set.add(uid)
  return [...set]
}

/**
 * Is a single judge's evaluation finished?
 * Two-part needs BOTH parts submitted; single-rubric needs the one submission.
 */
export function evaluationComplete(data) {
  if (!data || typeof data !== 'object') return false
  if (data.scoringMode === 'twoPart') {
    return data.statusA === 'submitted' && data.statusB === 'submitted'
  }
  return data.evaluationStatus === 'submitted'
}

/**
 * One judge's score for a team as a 0–100 percentage, or null if incomplete.
 * Two-part uses the server-computed weighted `finalScorePct`. Single-rubric is
 * derived from the criteria snapshot stored on the evaluation, so it stays
 * correct even if the admin edits the rubric afterwards.
 */
export function evaluationScorePct(data) {
  if (!evaluationComplete(data)) return null
  if (data.scoringMode === 'twoPart') {
    return typeof data.finalScorePct === 'number' ? data.finalScorePct : null
  }
  const criteria = Array.isArray(data.evaluationCriteria) ? data.evaluationCriteria : []
  if (criteria.length === 0) return null
  const { total, max } = computePartTotal(data.scores, criteria)
  if (!(max > 0)) return null
  return Math.round((total / max) * 1000) / 10
}

/**
 * Compute a team's final score from its department panel.
 *
 * @param {{limit:number, judges:string[]}|null} panel
 * @param {Record<string, object|null>} evalsByJudge  judgeUid -> evaluation doc data
 * @param {Record<string, string>} judgeNames         judgeUid -> display label
 * @returns {{
 *   department?: string, limit: number, expectedCount: number, submittedCount: number,
 *   isFinal: boolean, finalScore: number|null, judges: Array<object>, message: string
 * }}
 */
export function computeTeamFinalScore(panel, evalsByJudge = {}, judgeNames = {}) {
  const uids = Array.isArray(panel?.judges) ? panel.judges : []
  const expectedCount = uids.length

  const judges = uids.map((uid, i) => {
    const data = evalsByJudge[uid] || null
    const complete = evaluationComplete(data)
    return {
      position: i + 1,
      uid,
      name: judgeNames[uid] || '',
      submitted: complete,
      scorePct: complete ? evaluationScorePct(data) : null,
      // 'pending' | 'in-progress' | 'submitted' — for dashboards
      state: complete ? 'submitted' : data ? 'in-progress' : 'pending',
    }
  })

  const scored = judges.filter((j) => j.submitted && typeof j.scorePct === 'number')
  const submittedCount = judges.filter((j) => j.submitted).length
  const scoredCount = scored.length
  const isFinal = expectedCount > 0 && scoredCount === expectedCount

  const finalScore = isFinal
    ? Math.round((scored.reduce((s, j) => s + j.scorePct, 0) / scoredCount) * 10) / 10
    : null

  let message
  if (expectedCount === 0) {
    message = 'No judge panel is configured for this department yet.'
  } else if (isFinal) {
    message =
      expectedCount === 1
        ? 'Final score submitted.'
        : `Final score is the average of all ${expectedCount} judges.`
  } else if (submittedCount === expectedCount) {
    // Everyone submitted but at least one score is unreadable — e.g. a legacy
    // evaluation saved without its criteria snapshot, or a two-part doc missing
    // finalScorePct. Say so plainly instead of asking for a submission that
    // has already happened.
    message = `All ${expectedCount} judges submitted, but ${expectedCount - scoredCount} score(s) could not be read (evaluation saved without rubric details). Ask that judge to re-submit, or delete their evaluation so they can score again.`
  } else {
    message = `Only ${submittedCount} of ${expectedCount} judges ${submittedCount === 1 ? 'has' : 'have'} submitted. The final score is calculated once all ${expectedCount} submit.`
  }

  return { limit: panel?.limit ?? 0, expectedCount, submittedCount, scoredCount, isFinal, finalScore, judges, message }
}

/**
 * Find judges who scored a team but are NOT on its panel.
 *
 * This is possible because department access (`users.assignedDepartments`, also
 * settable from the legacy "By Department" tab), direct team assignment
 * (`teams.judgeIds`), problem-statement and domain/track assignments all grant a
 * judge the right to SCORE a team — while only PANEL membership decides whose
 * score counts toward the average. Surfacing these prevents an evaluation from
 * being silently discarded.
 */
export function findOffPanelJudges(panel, evalsByJudge = {}, judgeNames = {}) {
  const onPanel = new Set(Array.isArray(panel?.judges) ? panel.judges : [])
  const out = []
  for (const [uid, data] of Object.entries(evalsByJudge)) {
    if (onPanel.has(uid)) continue
    if (!evaluationComplete(data)) continue
    out.push({ uid, name: judgeNames[uid] || uid, scorePct: evaluationScorePct(data) })
  }
  return out
}

/**
 * Judge-facing view of a panel result.
 *
 * SECURITY: a co-judge's score is only included once the WHOLE panel has
 * submitted — before that the field is null so it never reaches the client
 * (prevents one judge anchoring on the other's marks). A judge always sees
 * their own score.
 */
export function judgePanelView(result, myUid) {
  return {
    ...result,
    judges: result.judges.map((j) => ({
      position: j.position,
      name: j.name,
      isMe: j.uid === myUid,
      submitted: j.submitted,
      state: j.state,
      scorePct: result.isFinal || j.uid === myUid ? j.scorePct : null,
    })),
  }
}

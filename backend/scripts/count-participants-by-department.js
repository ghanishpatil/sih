/**
 * Count participants grouped by department.
 *
 * Departments are captured per member at registration time and stored on the
 * `memberRegistrations` collection. The team leader is the row flagged
 * `isLeader` (falling back to the lowest `order` if no flag is set); every
 * other row in the same team is a non-leader member.
 *
 * Prints three breakdowns:
 *   1. LEADERS by department          — one leader per team
 *   2. MEMBERS (non-leader) by dept   — everyone who is not the team leader
 *   3. ALL PARTICIPANTS by dept       — leaders + members combined (grand total)
 *
 * Usage:  node scripts/count-participants-by-department.js
 */

import { initFirebaseAdmin, getDb } from '../services/firebaseAdmin.js'

const UNSET = '(not set)'
const bump = (map, key, n = 1) => map.set(key, (map.get(key) || 0) + n)

async function main() {
  initFirebaseAdmin()
  const db = getDb()

  console.log('🔍 Reading memberRegistrations…')
  const snap = await db.collection('memberRegistrations').limit(20000).get()

  // Group rows by team so we can identify the leader within each team.
  const membersByTeam = new Map()
  for (const doc of snap.docs) {
    const m = doc.data() || {}
    const teamId = m.teamId || doc.id
    if (!membersByTeam.has(teamId)) membersByTeam.set(teamId, [])
    membersByTeam.get(teamId).push(m)
  }

  const leadersByDept = new Map()   // leader rows only
  const membersByDept = new Map()   // non-leader rows only
  const allByDept = new Map()       // everyone

  let totalLeaders = 0
  let totalMembers = 0

  for (const members of membersByTeam.values()) {
    const sorted = members.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const leader = sorted.find((x) => x.isLeader) || sorted[0] || {}

    for (const m of sorted) {
      const dept = String(m.department || '').trim() || UNSET
      bump(allByDept, dept)
      if (m === leader) {
        bump(leadersByDept, dept)
        totalLeaders += 1
      } else {
        bump(membersByDept, dept)
        totalMembers += 1
      }
    }
  }

  const totalAll = snap.size

  const printSection = (title, map, total) => {
    console.log('\n════════════════════════════════════════════════')
    console.log(`${title}  (total: ${total})`)
    console.log('════════════════════════════════════════════════')
    const rows = [...map.entries()].sort((a, b) => b[1] - a[1])
    if (!rows.length) {
      console.log('  (none)')
      return
    }
    const width = Math.max(12, ...rows.map(([k]) => k.length))
    for (const [dept, count] of rows) {
      const pct = total ? ((count / total) * 100).toFixed(1) : '0.0'
      console.log(`  ${dept.padEnd(width)}  ${String(count).padStart(5)}  (${pct}%)`)
    }
  }

  printSection('LEADERS BY DEPARTMENT', leadersByDept, totalLeaders)
  printSection('MEMBERS (NON-LEADER) BY DEPARTMENT', membersByDept, totalMembers)
  printSection('ALL PARTICIPANTS BY DEPARTMENT (leaders + members)', allByDept, totalAll)

  console.log('\n────────────────────────────────────────────────')
  console.log(`Totals →  Leaders: ${totalLeaders}   Members: ${totalMembers}   All participants: ${totalAll}   Teams: ${membersByTeam.size}`)
  console.log('────────────────────────────────────────────────\n')

  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})

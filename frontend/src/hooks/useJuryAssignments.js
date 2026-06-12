import { useCallback, useEffect, useState } from 'react'
import { useApi } from '@/hooks/useApi.js'

/** Scoped jury workspace payload from `/api/judges/assignments` (no global team search). */
export function useJuryAssignments() {
  const api = useApi()
  const [teams, setTeams] = useState([])
  const [problems, setProblems] = useState([])
  const [problemStatementIds, setProblemStatementIds] = useState([])
  const [edition, setEdition] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.judgeAssignments()
      setTeams(Array.isArray(res.teams) ? res.teams : [])
      setProblems(Array.isArray(res.problems) ? res.problems : [])
      setProblemStatementIds(Array.isArray(res.problemStatementIds) ? res.problemStatementIds : [])
      setEdition(res.edition || null)
    } catch (e) {
      setTeams([])
      setProblems([])
      setProblemStatementIds([])
      setEdition(null)
      setError(e.message || 'Could not load assignments')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void reload()
  }, [reload])

  return { teams, problems, problemStatementIds, edition, loading, error, reload }
}

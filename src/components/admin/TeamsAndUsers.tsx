import { Crown, Loader2, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { cn, errorMessage, inputClass, LEVEL_LABELS, LEVEL_STYLES, ROLE_LABELS } from '../../lib/utils'
import type { AdminUser, LeagueLevel, Team, UserRole } from '../../types/database.types'

type Props = {
  teams: Team[]
  currentUserId: string
  onTeamsChanged: () => void
}

const LEVELS: LeagueLevel[] = ['top', 'bottom', 'reserve']
const ROLES: UserRole[] = ['player', 'captain', 'admin']

export default function TeamsAndUsers({ teams, currentUserId, onTeamsChanged }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [newTeam, setNewTeam] = useState({ name: '', level: 'top' as LeagueLevel })

  const loadUsers = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_list_users')
    if (error) setError(errorMessage(error))
    else setUsers(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  async function updateUser(id: string, patch: { role?: UserRole; team_id?: string | null }) {
    setSavingId(id)
    setError(null)
    const { error } = await supabase.from('profiles').update(patch).eq('id', id)
    if (error) setError(errorMessage(error))
    await loadUsers()
    setSavingId(null)
  }

  async function addTeam(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const { error } = await supabase.from('teams').insert({ name: newTeam.name.trim(), level: newTeam.level })
    if (error) return setError(errorMessage(error))
    setNewTeam({ name: '', level: newTeam.level })
    onTeamsChanged()
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }, [users, search])

  const unassigned = users.filter((u) => !u.team_id && u.role !== 'admin').length

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Teams</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {teams.map((t) => {
            const members = users.filter((u) => u.team_id === t.id)
            return (
              <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{t.name}</h3>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', LEVEL_STYLES[t.level])}>
                    {LEVEL_LABELS[t.level]}
                  </span>
                </div>
                <p className="mb-2 text-xs text-slate-500">{members.length} players</p>
                <ul className="space-y-0.5 text-sm">
                  {members.map((m) => (
                    <li key={m.id} className="flex items-center gap-1.5">
                      {m.role === 'captain' && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                      {m.full_name || m.email}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}

          <form onSubmit={addTeam} className="space-y-2 rounded-2xl border border-dashed border-slate-300 p-4">
            <h3 className="text-sm font-semibold text-slate-600">New team</h3>
            <input
              required
              placeholder="Team name"
              value={newTeam.name}
              onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
              className={inputClass}
            />
            <select
              value={newTeam.level}
              onChange={(e) => setNewTeam({ ...newTeam, level: e.target.value as LeagueLevel })}
              className={inputClass}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-600 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
            >
              <Plus className="h-4 w-4" />
              Add team
            </button>
          </form>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Users</h2>
            <p className="text-xs text-slate-500">
              {users.length} accounts{unassigned > 0 && ` · ${unassigned} without a team`}
            </p>
          </div>
          <div className="relative">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              placeholder="Search name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(inputClass, 'w-64 pl-9')}
            />
          </div>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-4 py-2.5 font-medium">Team</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => (
                  <tr key={u.id} className={cn(!u.team_id && u.role !== 'admin' && 'bg-amber-50/50')}>
                    <td className="px-4 py-2 font-medium">{u.full_name || '—'}</td>
                    <td className="px-4 py-2 text-slate-500">{u.email}</td>
                    <td className="px-4 py-2">
                      <select
                        value={u.team_id ?? ''}
                        disabled={savingId === u.id}
                        onChange={(e) => updateUser(u.id, { team_id: e.target.value || null })}
                        className={cn(inputClass, 'py-1')}
                      >
                        <option value="">No team</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} · {LEVEL_LABELS[t.level]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={u.role}
                        disabled={savingId === u.id || u.id === currentUserId}
                        title={u.id === currentUserId ? "You can't change your own role" : undefined}
                        onChange={(e) => updateUser(u.id, { role: e.target.value as UserRole })}
                        className={cn(inputClass, 'py-1')}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="pr-4">{savingId === u.id && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

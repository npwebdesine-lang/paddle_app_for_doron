import { addMinutes } from 'date-fns'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { LeagueLevel, Practice, PracticeWithDetails, UserRole } from '../types/database.types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** A practice is "low" when fewer than this many players are attending. */
export const MIN_PLAYERS = 4

export const LEVEL_LABELS: Record<LeagueLevel, string> = {
  top: 'Top',
  bottom: 'Bottom',
  reserve: 'Reserve',
}

export const LEVEL_STYLES: Record<LeagueLevel, string> = {
  top: 'bg-indigo-100 text-indigo-800',
  bottom: 'bg-sky-100 text-sky-800',
  reserve: 'bg-slate-200 text-slate-700',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  player: 'Player',
  captain: 'Captain',
  admin: 'Admin',
}

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

export function attendingCount(practice: PracticeWithDetails) {
  return practice.participations.filter((p) => p.status === 'attending').length
}

export function practiceEnd(practice: Practice) {
  return addMinutes(new Date(practice.scheduled_at), practice.duration_minutes)
}

export function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) return String(err.message)
  return 'Something went wrong'
}

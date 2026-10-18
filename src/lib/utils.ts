import { addMinutes, format, isToday, isTomorrow } from 'date-fns'
import { he } from 'date-fns/locale'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { LeagueLevel, Practice, PracticeStatus, PracticeWithDetails, UserRole } from '../types/database.types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** A practice is "low" when fewer than this many players are attending. */
export const MIN_PLAYERS = 4

export const LEVEL_LABELS: Record<LeagueLevel, string> = {
  top: 'עליונה',
  bottom: 'תחתונה',
  reserve: 'רזרבה',
}

export const LEVEL_STYLES: Record<LeagueLevel, string> = {
  top: 'bg-indigo-100 text-indigo-800',
  bottom: 'bg-sky-100 text-sky-800',
  reserve: 'bg-slate-200 text-slate-700',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  player: 'שחקן',
  captain: 'קפטן',
  admin: 'רכז',
}

export const STATUS_LABELS: Record<PracticeStatus, string> = {
  scheduled: 'מתוכנן',
  at_risk: 'בסיכון',
  cancelled: 'בוטל',
  completed: 'הסתיים',
}

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

/** date-fns format in Hebrew. */
export function formatHe(date: Date, pattern: string) {
  return format(date, pattern, { locale: he })
}

export function dayLabel(date: Date) {
  if (isToday(date)) return 'היום'
  if (isTomorrow(date)) return 'מחר'
  return formatHe(date, 'EEEE, d בMMMM')
}

export function spotsLabel(spotsLeft: number) {
  if (spotsLeft === 0) return 'מלא'
  if (spotsLeft === 1) return 'מקום פנוי אחד'
  return `${spotsLeft} מקומות פנויים`
}

export function attendingCount(practice: PracticeWithDetails) {
  return practice.participations.filter((p) => p.status === 'attending').length
}

export function practiceEnd(practice: Practice) {
  return addMinutes(new Date(practice.scheduled_at), practice.duration_minutes)
}

/** Known server/auth messages → Hebrew. Matched by substring, case-insensitive. */
const ERROR_TRANSLATIONS: [string, string][] = [
  ['invalid login credentials', 'אימייל או סיסמה שגויים'],
  ['user already registered', 'כבר קיים משתמש עם האימייל הזה'],
  ['password should be at least', 'הסיסמה חייבת להכיל לפחות 6 תווים'],
  ['email not confirmed', 'האימייל עדיין לא אומת. בדקו את תיבת הדואר.'],
  ['unable to validate email', 'כתובת האימייל אינה תקינה'],
  ['rate limit', 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.'],
  ['failed to fetch', 'אין חיבור לשרת. בדקו את החיבור לאינטרנט.'],
  ['networkerror', 'אין חיבור לשרת. בדקו את החיבור לאינטרנט.'],
  ['already full', 'האימון כבר מלא'],
  ['no longer open', 'האימון כבר לא פתוח להרשמה'],
  ['already started', 'האימון כבר התחיל'],
  ['only report whether there was a coach', 'קפטן יכול לעדכן רק אם היה מאמן'],
  ['only change your attendance status', 'אפשר לשנות רק את סטטוס ההגעה שלך'],
  ['only change your name and phone', 'אפשר לשנות רק את השם והטלפון שלך'],
  ['only admins can list users', 'רק רכז יכול לצפות ברשימת המשתמשים'],
  ['row-level security', 'אין לך הרשאה לבצע את הפעולה הזו'],
  ['duplicate key', 'הרשומה כבר קיימת'],
  ['jwt expired', 'פג תוקף ההתחברות. התחברו מחדש.'],
]

export function errorMessage(err: unknown): string {
  const raw = err && typeof err === 'object' && 'message' in err ? String(err.message) : ''
  const lower = raw.toLowerCase()
  const match = ERROR_TRANSLATIONS.find(([needle]) => lower.includes(needle))
  if (match) return match[1]
  return raw || 'משהו השתבש. נסו שוב.'
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/utils'
import type { PracticeWithDetails } from '../types/database.types'

type Range = { from: Date; to?: Date }

/**
 * Loads practices (with team + participations) in a date range and keeps them
 * fresh via Supabase Realtime: any change to participations or practices
 * triggers a debounced refetch, so every open screen updates instantly.
 */
export function useRealtimePractices({ from, to }: Range, channelName: string) {
  const [practices, setPractices] = useState<PracticeWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const fromIso = from.toISOString()
  const toIso = to?.toISOString()

  const refetch = useCallback(async () => {
    let query = supabase
      .from('practices')
      .select('*, teams(id, name), participations(*, profiles(id, full_name))')
      .gte('scheduled_at', fromIso)
      .order('scheduled_at')
      .limit(500)
    if (toIso) query = query.lte('scheduled_at', toIso)

    const { data, error } = await query
    if (error) setError(errorMessage(error))
    else {
      setError(null)
      setPractices((data ?? []) as PracticeWithDetails[])
    }
    setLoading(false)
  }, [fromIso, toIso])

  useEffect(() => {
    refetch()

    const schedule = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(refetch, 150)
    }
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participations' }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'practices' }, schedule)
      .subscribe((status) => setLive(status === 'SUBSCRIBED'))

    return () => {
      clearTimeout(timer.current)
      supabase.removeChannel(channel)
    }
  }, [refetch, channelName])

  return { practices, loading, error, live, refetch }
}

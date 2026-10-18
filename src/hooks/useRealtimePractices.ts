import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/utils'
import type { PracticeWithDetails } from '../types/database.types'

type Range = { from: Date; to?: Date }
type LoadResult = { data: PracticeWithDetails[]; error: null } | { data: null; error: string }

/**
 * Loads practices (with team + participations) in a date range and keeps them
 * fresh via Supabase Realtime: any change to participations or practices
 * triggers a debounced refetch, so every open screen updates instantly.
 * Pass a memoized range — a new Date each render would refetch forever.
 */
export function useRealtimePractices({ from, to }: Range, channelName: string) {
  const [practices, setPractices] = useState<PracticeWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const fromIso = from.toISOString()
  const toIso = to?.toISOString()

  const load = useCallback(async (): Promise<LoadResult> => {
    try {
      let query = supabase
        .from('practices')
        .select('*, teams(id, name), participations(*, profiles(id, full_name))')
        .gte('scheduled_at', fromIso)
        .order('scheduled_at')
        .limit(500)
      if (toIso) query = query.lte('scheduled_at', toIso)

      const { data, error } = await query
      if (error) return { data: null, error: errorMessage(error) }
      return { data: (data ?? []) as PracticeWithDetails[], error: null }
    } catch (err) {
      return { data: null, error: errorMessage(err) }
    }
  }, [fromIso, toIso])

  const apply = useCallback((result: LoadResult) => {
    if (result.error !== null) setError(result.error)
    else {
      setError(null)
      setPractices(result.data)
    }
    setLoading(false)
  }, [])

  const refetch = useCallback(() => load().then(apply), [load, apply])

  useEffect(() => {
    let active = true
    const run = () =>
      load().then((result) => {
        if (active) apply(result)
      })

    run()

    const schedule = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(run, 150)
    }
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participations' }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'practices' }, schedule)
      .subscribe((status) => {
        if (active) setLive(status === 'SUBSCRIBED')
      })

    return () => {
      active = false
      clearTimeout(timer.current)
      supabase.removeChannel(channel)
    }
  }, [load, apply, channelName])

  return { practices, loading, error, live, refetch }
}

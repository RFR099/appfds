import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'

/** GET com estado de carregamento/erro, recarregamento manual e polling opcional. */
export function useApi<T>(url: string | null, { poll }: { poll?: number } = {}) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!url)
  const seq = useRef(0)

  const load = useCallback(async (silent = false) => {
    if (!url) return
    const my = ++seq.current
    if (!silent) setLoading(true)
    try {
      const d = await api.get<T>(url)
      if (my === seq.current) {
        setData(d)
        setError(null)
      }
    } catch (e) {
      if (my === seq.current) setError((e as Error).message)
    } finally {
      if (my === seq.current) setLoading(false)
    }
  }, [url])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!poll || !url) return
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') load(true)
    }, poll)
    return () => clearInterval(t)
  }, [poll, url, load])

  return { data, error, loading, reload: () => load(true), setData }
}

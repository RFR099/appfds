import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, setUnauthorizedHandler } from './api'
import type { User } from './types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<User>
  logout: () => Promise<void>
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    api.get<User>('/auth/me').then(setUser).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const u = await api.post<User>('/auth/login', { username, password })
    setUser(u)
    return u
  }, [])

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => undefined)
    setUser(null)
  }, [])

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth fora do AuthProvider')
  return c
}

export const homeFor = (u: User) => (u.role === 'director' ? '/diretor' : '/operador')

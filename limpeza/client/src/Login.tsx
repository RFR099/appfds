import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './components/ui'
import { homeFor, useAuth } from './lib/auth'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const u = await login(username.trim(), password)
      nav(homeFor(u), { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const fill = (u: string, p: string) => {
    setUsername(u)
    setPassword(p)
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3 text-white">
          <div className="grid size-12 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <svg viewBox="0 0 32 32" className="size-7"><path d="M16 4l3 7.5L26.5 14 19 17l-3 7.5-3-7.5L5.5 14 13 11z" fill="currentColor" /></svg>
          </div>
          <div>
            <div className="text-xl font-semibold">BrilhoTotal</div>
            <div className="text-sm text-brand-200">Gestão operacional e financeira</div>
          </div>
        </div>
        <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
          <h1 className="text-lg font-semibold text-slate-900">Iniciar sessão</h1>
          <p className="mt-1 text-sm text-slate-500">Acesso exclusivo a diretor e chefes de carrinha.</p>
          <label className="mt-5 block">
            <span className="label">Utilizador</span>
            <input className="field py-3 text-base" autoComplete="username" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </label>
          <label className="mt-4 block">
            <span className="label">Password</span>
            <input className="field py-3 text-base" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <div className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          <button disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 py-3 text-base font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
            <Icon name="lock" className="size-4" /> {busy ? 'A entrar…' : 'Entrar'}
          </button>
        </form>
        <div className="mt-4 rounded-xl bg-white/5 p-4 text-sm text-brand-100 ring-1 ring-white/10">
          <div className="mb-2 font-medium text-white">Contas de demonstração</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => fill('diretor', 'diretor123')} className="rounded-lg bg-white/10 px-3 py-2 text-left hover:bg-white/15">
              <div className="font-medium text-white">Diretor</div>
              <div className="text-xs">diretor / diretor123</div>
            </button>
            <button type="button" onClick={() => fill('carlos.silva', 'operador123')} className="rounded-lg bg-white/10 px-3 py-2 text-left hover:bg-white/15">
              <div className="font-medium text-white">Operador (tablet)</div>
              <div className="text-xs">carlos.silva / operador123</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

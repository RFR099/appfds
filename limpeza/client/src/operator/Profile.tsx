import { useState } from 'react'
import { Loading } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { dateTime } from '../lib/format'
import { useApi } from '../lib/useApi'
import { BigButton } from './shared'

interface ProfileData {
  username: string
  name: string
  phone: string | null
  can_manage_team: number
  last_login_at: string | null
  stats: { total: number; this_month: number | null }
  team: { name: string; van_name: string | null; plate: string | null } | null
}

export default function Profile() {
  const { logout } = useAuth()
  const { data, loading } = useApi<ProfileData>('/op/profile')
  const [pw, setPw] = useState({ current: '', next: '' })
  const [msg, setMsg] = useState<string | null>(null)
  if (loading && !data) return <Loading />
  if (!data) return null
  const change = async () => {
    try {
      await api.post('/auth/password', pw)
      setPw({ current: '', next: '' })
      setMsg('Password alterada com sucesso.')
    } catch (e) {
      setMsg((e as Error).message)
    }
  }
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold text-slate-900">Perfil</h1>
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-4">
          <div className="grid size-16 place-items-center rounded-full bg-brand-100 text-2xl font-bold text-brand-800">{data.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</div>
          <div>
            <div className="text-2xl font-bold">{data.name}</div>
            <div className="text-lg text-slate-500">@{data.username} · Chefe de carrinha</div>
          </div>
        </div>
        <dl className="mt-6 grid gap-4 text-lg sm:grid-cols-2">
          <div><dt className="text-sm font-bold tracking-wider text-slate-500 uppercase">Equipa</dt><dd>{data.team?.name ?? '—'}</dd></div>
          <div><dt className="text-sm font-bold tracking-wider text-slate-500 uppercase">Carrinha habitual</dt><dd>{data.team?.van_name ? `${data.team.van_name} · ${data.team.plate}` : '—'}</dd></div>
          <div><dt className="text-sm font-bold tracking-wider text-slate-500 uppercase">Serviços concluídos (mês)</dt><dd>{data.stats.this_month ?? 0}</dd></div>
          <div><dt className="text-sm font-bold tracking-wider text-slate-500 uppercase">Serviços concluídos (total)</dt><dd>{data.stats.total}</dd></div>
          <div><dt className="text-sm font-bold tracking-wider text-slate-500 uppercase">Último acesso</dt><dd>{dateTime(data.last_login_at)}</dd></div>
          <div><dt className="text-sm font-bold tracking-wider text-slate-500 uppercase">Gestão de equipa</dt><dd>{data.can_manage_team ? 'Autorizado' : 'Não autorizado'}</dd></div>
        </dl>
      </section>
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 text-xl font-bold">Alterar password</h2>
        {msg && <p className="mb-3 text-base text-slate-700">{msg}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <input type="password" className="field py-3 text-lg" placeholder="Password atual" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          <input type="password" className="field py-3 text-lg" placeholder="Nova password (mín. 8)" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
        </div>
        <button onClick={change} className="mt-3 rounded-xl bg-slate-800 px-6 py-3 text-lg font-semibold text-white">Guardar</button>
      </section>
      <BigButton tone="slate" icon="logout" onClick={logout}>Terminar sessão</BigButton>
    </div>
  )
}

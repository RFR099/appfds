import { useCallback, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon, Loading, Modal } from '../components/ui'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { ISSUE_CATEGORIES, time } from '../lib/format'
import type { OpService } from '../lib/types'
import { useApi } from '../lib/useApi'
import { ServiceActions, ServiceCard, Toast } from './shared'

export default function ServicePage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const { data: s, error, loading, setData, reload } = useApi<OpService>(`/op/services/${id}`)
  const [toast, setToast] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [teamOpen, setTeamOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const clearToast = useCallback(() => setToast(null), [])

  if (loading && !s) return <Loading />
  if (error || !s) return <div className="rounded-2xl bg-white p-8 text-center text-xl text-slate-600">{error ?? 'Serviço não encontrado.'}</div>

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    const fd = new FormData()
    Array.from(files).forEach((f) => fd.append('photos', f))
    try {
      setData(await api.post<OpService>(`/op/services/${s.id}/photos`, fd))
      setToast(`${files.length} fotografia(s) enviada(s)`)
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }
  const canEditTeam = user?.can_manage_team && !['concluido', 'cancelado'].includes(s.status)

  return (
    <div className="space-y-5">
      {toast && <Toast message={toast} onDone={clearToast} />}
      <button onClick={() => nav(-1)} className="inline-flex items-center gap-1 py-2 text-lg font-semibold text-slate-600"><Icon name="back" className="size-6" /> Voltar</button>
      <ServiceCard s={s} />
      <ServiceActions s={s} onChanged={(n, message) => { setData(n); if (message) setToast(message) }} />

      {s.status !== 'cancelado' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <button disabled={uploading} onClick={() => fileRef.current?.click()} className="flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-white text-xl font-semibold text-slate-700 ring-2 ring-slate-200 active:bg-slate-50">
            <Icon name="camera" className="size-7" /> {uploading ? 'A enviar…' : 'Adicionar fotografias'}
          </button>
          {canEditTeam && (
            <button onClick={() => setTeamOpen(true)} className="flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-white text-xl font-semibold text-slate-700 ring-2 ring-slate-200 active:bg-slate-50">
              <Icon name="employees" className="size-7" /> Ajustar equipa
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => upload(e.target.files)} />
        </div>
      )}

      {s.photos.length > 0 && (
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-3 text-sm font-bold tracking-wider text-slate-500 uppercase">Fotografias ({s.photos.length})</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {s.photos.map((p) => <img key={p.id} src={`/api/photos/${p.id}`} alt="Fotografia do serviço" loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover ring-1 ring-slate-200" />)}
          </div>
        </section>
      )}

      {s.status === 'concluido' && (
        <section className="space-y-3 rounded-3xl bg-white p-5 text-lg shadow-sm ring-1 ring-slate-200">
          <div><span className="font-semibold">Serviço concluído:</span> {s.completed_ok ? 'Sim' : 'Não'} · <span className="font-semibold">Problemas:</span> {s.had_problems ? 'Sim' : 'Não'}</div>
          {s.observations && <div><span className="font-semibold">Observações:</span> {s.observations}</div>}
          {s.issues.map((i) => <div key={i.id} className="rounded-xl bg-rose-50 px-4 py-2 text-rose-800">{ISSUE_CATEGORIES[i.category]}{i.description && ` — ${i.description}`}</div>)}
        </section>
      )}

      <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 text-sm font-bold tracking-wider text-slate-500 uppercase">Registo</h2>
        <ol className="space-y-2 text-lg">
          {s.events.map((e, i) => <li key={i} className="flex gap-4"><span className="w-16 shrink-0 font-bold tabular-nums">{time(e.at)}</span><span>{e.message}</span></li>)}
        </ol>
      </section>

      {teamOpen && <TeamModal s={s} onClose={() => setTeamOpen(false)} onChanged={(n) => { setData(n); reload() }} />}
    </div>
  )
}

function TeamModal({ s, onClose, onChanged }: { s: OpService; onClose: () => void; onChanged: (s: OpService) => void }) {
  const { data: emps } = useApi<{ id: number; name: string; job_title: string }[]>('/op/employees')
  const [err, setErr] = useState<string | null>(null)
  const inTeam = new Set(s.team.map((t) => t.id))
  const run = async (fn: () => Promise<OpService>) => {
    setErr(null)
    try { onChanged(await fn()) } catch (e) { setErr((e as Error).message) }
  }
  return (
    <Modal open onClose={onClose} title="Ajustar equipa" wide>
      {err && <p className="mb-3 text-rose-700">{err}</p>}
      <h3 className="mb-2 font-semibold">Na equipa</h3>
      <ul className="mb-4 space-y-2">
        {s.team.map((m) => (
          <li key={m.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-lg">
            {m.name}
            {!m.is_leader && <button className="rounded-lg bg-rose-100 px-4 py-2 font-semibold text-rose-700" onClick={() => run(() => api.del(`/op/services/${s.id}/team/${m.id}`))}>Remover</button>}
          </li>
        ))}
      </ul>
      <h3 className="mb-2 font-semibold">Adicionar funcionário</h3>
      <div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">
        {emps?.filter((e) => !inTeam.has(e.id) && e.job_title !== 'Chefe de carrinha').map((e) => (
          <button key={e.id} className="rounded-xl bg-white px-4 py-3 text-left text-lg ring-1 ring-slate-200 active:bg-slate-50" onClick={() => run(() => api.post(`/op/services/${s.id}/team`, { employee_id: e.id }))}>
            + {e.name}
          </button>
        ))}
      </div>
    </Modal>
  )
}

import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { cx, Icon, Loading } from '../components/ui'
import { api } from '../lib/api'
import { ISSUE_CATEGORIES, localHHMM, time } from '../lib/format'
import type { OpService } from '../lib/types'
import { useApi } from '../lib/useApi'
import { BigButton } from './shared'

/** Formulário de conclusão do serviço — simples, grande, pensado para usar com luvas. */
export default function FinishService() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data: s, loading } = useApi<OpService>(`/op/services/${id}`)
  const [endTime, setEndTime] = useState(localHHMM(new Date().toISOString()))
  const [completed, setCompleted] = useState(true)
  const [problems, setProblems] = useState(false)
  const [obs, setObs] = useState('')
  const [issues, setIssues] = useState<Record<string, string>>({})
  const [present, setPresent] = useState<number[]>([])
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { if (s) setPresent(s.team.map((t) => t.id)) }, [s])
  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [photos])

  if (loading && !s) return <Loading />
  if (!s) return null
  if (s.status !== 'em_execucao') {
    return <div className="rounded-2xl bg-white p-8 text-center text-xl">Este serviço não está em execução. <button className="font-semibold text-brand-700 underline" onClick={() => nav('/operador')}>Voltar</button></div>
  }

  const toggleIssue = (k: string) => setIssues((x) => {
    const n = { ...x }
    if (k in n) delete n[k]
    else n[k] = ''
    return n
  })

  const submit = async () => {
    setBusy(true)
    setError(null)
    const fd = new FormData()
    fd.append('data', JSON.stringify({
      end_time: endTime,
      completed_ok: completed,
      had_problems: problems,
      observations: obs,
      issues: problems ? Object.entries(issues).map(([category, description]) => ({ category, description })) : [],
      present_employee_ids: present,
    }))
    photos.forEach((f) => fd.append('photos', f))
    try {
      const r = await api.post<OpService>(`/op/services/${s.id}/finish`, fd)
      nav('/operador', { replace: true, state: { toast: `Serviço terminado às ${time(r.finished_at)}` } })
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="space-y-5">
      <button onClick={() => nav(-1)} className="inline-flex items-center gap-1 py-2 text-lg font-semibold text-slate-600"><Icon name="back" className="size-6" /> Voltar</button>
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Terminar serviço</h1>
        <p className="text-xl text-slate-600">{s.client.name} · iniciado às {time(s.started_at)}</p>
      </div>
      {error && <div className="rounded-2xl bg-rose-50 px-5 py-4 text-lg text-rose-800 ring-1 ring-rose-200">{error}</div>}

      <Section title="Hora de conclusão">
        <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full rounded-2xl border-2 border-slate-300 px-5 py-4 text-3xl font-bold tabular-nums outline-none focus:border-brand-600 sm:w-64" />
      </Section>

      <Section title="Serviço concluído?">
        <YesNo value={completed} onChange={setCompleted} />
      </Section>

      <Section title="Problemas durante o serviço?">
        <YesNo value={problems} onChange={setProblems} yesTone="rose" />
      </Section>

      {problems && (
        <Section title="Avarias / danos">
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(ISSUE_CATEGORIES).map(([k, label]) => (
              <button key={k} type="button" onClick={() => toggleIssue(k)}
                className={cx('flex min-h-16 items-center gap-3 rounded-2xl px-5 text-left text-xl font-semibold ring-2', k in issues ? 'bg-rose-50 text-rose-800 ring-rose-400' : 'bg-white text-slate-700 ring-slate-200')}>
                <span className={cx('grid size-8 place-items-center rounded-lg border-2', k in issues ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-300')}>{k in issues && <Icon name="check" className="size-5" />}</span>
                {label}
              </button>
            ))}
          </div>
          {Object.keys(issues).map((k) => (
            <input key={k} className="mt-3 w-full rounded-2xl border-2 border-slate-300 px-5 py-4 text-lg outline-none focus:border-brand-600"
              placeholder={`${ISSUE_CATEGORIES[k]} — descreva (opcional)`} value={issues[k]} onChange={(e) => setIssues({ ...issues, [k]: e.target.value })} />
          ))}
        </Section>
      )}

      <Section title="Observações">
        <textarea rows={4} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Indique qualquer problema ou observação."
          className="w-full rounded-2xl border-2 border-slate-300 px-5 py-4 text-xl outline-none focus:border-brand-600" />
      </Section>

      <Section title="Fotografias">
        <label className="flex min-h-20 cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white text-xl font-semibold text-slate-600 active:bg-slate-50">
          <Icon name="camera" className="size-8" /> Tirar / escolher fotografias
          <input type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => { setPhotos([...photos, ...Array.from(e.target.files ?? [])].slice(0, 10)); e.target.value = '' }} />
        </label>
        {previews.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {previews.map((u, i) => (
              <div key={u} className="relative">
                <img src={u} alt="" className="aspect-square w-full rounded-xl object-cover" />
                <button type="button" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute -top-2 -right-2 grid size-9 place-items-center rounded-full bg-rose-600 text-white shadow" aria-label="Remover">
                  <Icon name="x" className="size-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Funcionários presentes">
        <div className="grid gap-3 sm:grid-cols-2">
          {s.team.map((m) => {
            const on = present.includes(m.id)
            return (
              <button key={m.id} type="button" onClick={() => setPresent(on ? present.filter((x) => x !== m.id) : [...present, m.id])}
                className={cx('flex min-h-16 items-center gap-3 rounded-2xl px-5 text-left text-xl font-semibold ring-2', on ? 'bg-emerald-50 text-emerald-900 ring-emerald-400' : 'bg-white text-slate-400 line-through ring-slate-200')}>
                <span className={cx('grid size-8 place-items-center rounded-lg border-2', on ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300')}>{on && <Icon name="check" className="size-5" />}</span>
                {m.name}
              </button>
            )
          })}
        </div>
      </Section>

      <BigButton icon="check" disabled={busy} onClick={submit}>{busy ? 'A guardar…' : 'Confirmar conclusão'}</BigButton>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-3 text-sm font-bold tracking-[0.2em] text-slate-500 uppercase">{title}</h2>
      {children}
    </section>
  )
}

function YesNo({ value, onChange, yesTone = 'emerald' }: { value: boolean; onChange: (v: boolean) => void; yesTone?: 'emerald' | 'rose' }) {
  const yesOn = yesTone === 'rose' ? 'bg-rose-600 text-white ring-rose-600' : 'bg-emerald-600 text-white ring-emerald-600'
  return (
    <div className="grid grid-cols-2 gap-3">
      <button type="button" onClick={() => onChange(true)} className={cx('min-h-20 rounded-2xl text-2xl font-bold ring-2', value ? yesOn : 'bg-white text-slate-600 ring-slate-200')}>SIM</button>
      <button type="button" onClick={() => onChange(false)} className={cx('min-h-20 rounded-2xl text-2xl font-bold ring-2', !value ? 'bg-slate-800 text-white ring-slate-800' : 'bg-white text-slate-600 ring-slate-200')}>NÃO</button>
    </div>
  )
}

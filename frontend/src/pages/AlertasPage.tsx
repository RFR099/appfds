import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import api from "../lib/api"

interface AlertaFDS {
  fdsId: string
  nomeProdutoQuimico: string
  marca: string
  dataValidade: string
}

interface AlertaTicket {
  ticketId: string
  fornecedorId: string
  dataAbertura: string
}

interface Alertas {
  total: number
  fdsAExpirar: AlertaFDS[]
  ticketsSemResposta: AlertaTicket[]
}

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<Alertas | null>(null)

  useEffect(() => {
    api.get<Alertas>("/alertas").then((resp) => setAlertas(resp.data))
  }, [])

  if (!alertas) return <div className="text-slate-400">A carregar…</div>

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-slate-700">Alertas ({alertas.total})</h1>

      <section className="rounded-md border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-4 py-3 font-medium text-slate-700">
          FDS a expirar
        </h2>
        {alertas.fdsAExpirar.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-400">Sem alertas.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {alertas.fdsAExpirar.map((a) => (
              <li key={a.fdsId} className="flex items-center justify-between px-4 py-3 text-sm">
                <Link to={`/fds/${a.fdsId}`} className="text-brand-700 hover:underline">
                  {a.nomeProdutoQuimico} ({a.marca})
                </Link>
                <span className="text-slate-500">Válida até {a.dataValidade}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-md border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-4 py-3 font-medium text-slate-700">
          Tickets sem resposta do fornecedor
        </h2>
        {alertas.ticketsSemResposta.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-400">Sem alertas.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {alertas.ticketsSemResposta.map((t) => (
              <li key={t.ticketId} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>Ticket {t.ticketId}</span>
                <span className="text-slate-500">Aberto em {t.dataAbertura}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

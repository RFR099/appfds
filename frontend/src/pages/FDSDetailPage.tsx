import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import api from "../lib/api"
import { ESTADO_LABEL, type EstadoFDS } from "../types/fds"

interface FDSDetalhe {
  id: string
  nomeProdutoQuimico: string
  marca: string
  fornecedorId: string | null
  emailContacto: string | null
  estado: EstadoFDS
  dataRevisao: string | null
  dataValidade: string | null
  pictogramas: string[]
  temDissocianatos: boolean
}

export default function FDSDetailPage() {
  const { id } = useParams()
  const [fds, setFds] = useState<FDSDetalhe | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<FDSDetalhe>(`/fds/${id}`)
      .then((resp) => setFds(resp.data))
      .catch(() => setErro("Não foi possível carregar esta ficha de dados de segurança."))
  }, [id])

  if (erro) return <div className="rounded bg-red-50 px-4 py-3 text-red-700">{erro}</div>
  if (!fds) return <div className="text-slate-400">A carregar…</div>

  return (
    <div className="mx-auto max-w-2xl rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <Link to="/fds" className="text-sm text-brand-700 hover:underline">
        ← Voltar à lista
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-slate-800">{fds.nomeProdutoQuimico}</h1>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <Item label="Marca" valor={fds.marca} />
        <Item label="Estado" valor={ESTADO_LABEL[fds.estado]} />
        <Item label="E-mail do fornecedor" valor={fds.emailContacto ?? "—"} />
        <Item label="Tem dissocianatos" valor={fds.temDissocianatos ? "Sim" : "Não"} />
        <Item label="Data de revisão" valor={fds.dataRevisao ?? "—"} />
        <Item label="Data de validade" valor={fds.dataValidade ?? "—"} />
      </dl>
      {fds.pictogramas.length > 0 && (
        <div className="mt-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pictogramas</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {fds.pictogramas.map((p) => (
              <span key={p} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Item({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-slate-700">{valor}</dd>
    </div>
  )
}

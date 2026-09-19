import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import Campo from "../components/Campo"
import api from "../lib/api"
import { ESTADO_LABEL, type EstadoFDS, type FDSResumo, type FornecedorResumo, type Pagina } from "../types/fds"

interface Opcao {
  id: string
  nome: string
}

export default function FDSListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [pagina, setPagina] = useState<Pagina<FDSResumo> | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [centrosProdutivos, setCentrosProdutivos] = useState<Opcao[]>([])
  const [fornecedores, setFornecedores] = useState<Opcao[]>([])
  const [obras, setObras] = useState<Opcao[]>([])

  const [form, setForm] = useState({
    centroProdutivoId: searchParams.get("centroProdutivoId") ?? "",
    nome: searchParams.get("nome") ?? "",
    fornecedorId: searchParams.get("fornecedorId") ?? "",
    obraId: searchParams.get("obraId") ?? "",
    marca: searchParams.get("marca") ?? "",
    estado: (searchParams.get("estado") as EstadoFDS | "") ?? "",
  })

  useEffect(() => {
    Promise.all([
      api.get<Pagina<Opcao>>("/centros-produtivos", { params: { tamanho: 100 } }),
      api.get<Pagina<FornecedorResumo>>("/fornecedores", { params: { tamanho: 100 } }),
      api.get<Pagina<Opcao>>("/obras", { params: { tamanho: 100 } }),
    ])
      .then(([cp, forn, ob]) => {
        setCentrosProdutivos(cp.data.conteudo)
        setFornecedores(forn.data.conteudo)
        setObras(ob.data.conteudo)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setCarregando(true)
    setErro(null)
    const params: Record<string, string> = {}
    for (const [chave, valor] of searchParams.entries()) {
      if (valor) params[chave] = valor
    }
    api
      .get<Pagina<FDSResumo>>("/fds", { params })
      .then((resp) => setPagina(resp.data))
      .catch(() => setErro("Não foi possível carregar as fichas de dados de segurança."))
      .finally(() => setCarregando(false))
  }, [searchParams])

  function aplicarFiltros() {
    const params: Record<string, string> = {}
    for (const [chave, valor] of Object.entries(form)) {
      if (valor) params[chave] = valor
    }
    setSearchParams(params)
  }

  function limparFiltros() {
    setForm({ centroProdutivoId: "", nome: "", fornecedorId: "", obraId: "", marca: "", estado: "" })
    setSearchParams({})
  }

  function nomeFornecedor(id: string | null) {
    if (!id) return "—"
    return fornecedores.find((f) => f.id === id)?.nome ?? id
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-700">Fichas de Dados de Segurança (FDS)</h1>
        <div className="flex gap-2">
          <Link to="/fds/nova" className="rounded bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
            + Nova FDS
          </Link>
          <Link to="/tickets/novo" className="rounded bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
            + Novo Ticket
          </Link>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 border-b border-brand-700 pb-2 text-sm font-semibold uppercase tracking-wide text-brand-700">
          Filtrar FDS
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Campo label="Centro Produtivo">
            <select
              className="campo"
              value={form.centroProdutivoId}
              onChange={(e) => setForm({ ...form, centroProdutivoId: e.target.value })}
            >
              <option value="">Todos</option>
              {centrosProdutivos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Nome">
            <input
              className="campo"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome do produto"
            />
          </Campo>
          <Campo label="Fornecedor">
            <select
              className="campo"
              value={form.fornecedorId}
              onChange={(e) => setForm({ ...form, fornecedorId: e.target.value })}
            >
              <option value="">Todos</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Obra">
            <select
              className="campo"
              value={form.obraId}
              onChange={(e) => setForm({ ...form, obraId: e.target.value })}
            >
              <option value="">Todas</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Marca">
            <input
              className="campo"
              value={form.marca}
              onChange={(e) => setForm({ ...form, marca: e.target.value })}
              placeholder="Marca"
            />
          </Campo>
          <Campo label="Estado da FDS">
            <select
              className="campo"
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoFDS | "" })}
            >
              <option value="">Todos</option>
              {(Object.keys(ESTADO_LABEL) as EstadoFDS[]).map((e) => (
                <option key={e} value={e}>
                  {ESTADO_LABEL[e]}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={limparFiltros} className="rounded px-4 py-2 text-sm text-slate-500 hover:bg-slate-100">
            ✕ Limpar
          </button>
          <button onClick={aplicarFiltros} className="rounded bg-brand-800 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900">
            ▽ Filtrar
          </button>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-10 px-4 py-3" />
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Marca</th>
              <th className="px-4 py-3">Fornecedor</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Data de Revisão</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  A carregar…
                </td>
              </tr>
            )}
            {erro && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-red-500">
                  {erro}
                </td>
              </tr>
            )}
            {!carregando && !erro && pagina?.conteudo.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Nenhuma FDS encontrada.
                </td>
              </tr>
            )}
            {pagina?.conteudo.map((fds) => (
              <tr key={fds.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <input type="checkbox" />
                </td>
                <td className="px-4 py-3">
                  <Link to={`/fds/${fds.id}`} className="font-medium text-brand-700 hover:underline">
                    {fds.nomeProdutoQuimico}
                  </Link>
                </td>
                <td className="px-4 py-3">{fds.marca}</td>
                <td className="px-4 py-3">{nomeFornecedor(fds.fornecedorId)}</td>
                <td className="px-4 py-3">
                  <EstadoBadge estado={fds.estado} />
                </td>
                <td className="px-4 py-3">
                  {fds.dataRevisao ? new Date(fds.dataRevisao).toLocaleDateString("pt-PT") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EstadoBadge({ estado }: { estado: EstadoFDS }) {
  const cores: Record<EstadoFDS, string> = {
    RASCUNHO: "bg-slate-100 text-slate-600",
    ATUALIZADA: "bg-emerald-100 text-emerald-700",
    SOLICITADA_AO_FORNECEDOR: "bg-amber-100 text-amber-700",
    OBSOLETA: "bg-red-100 text-red-700",
  }
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cores[estado]}`}>{ESTADO_LABEL[estado]}</span>
}

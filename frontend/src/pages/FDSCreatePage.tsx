import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import Campo from "../components/Campo"
import api from "../lib/api"
import { PICTOGRAMAS, type CriarFDSCommand, type FornecedorResumo, type Pagina } from "../types/fds"

export default function FDSCreatePage() {
  const navigate = useNavigate()

  const [fornecedores, setFornecedores] = useState<FornecedorResumo[]>([])
  const [mostrarNovoFornecedor, setMostrarNovoFornecedor] = useState(false)
  const [novoFornecedorNome, setNovoFornecedorNome] = useState("")
  const [novoFornecedorEmail, setNovoFornecedorEmail] = useState("")

  const [nomeProdutoQuimico, setNomeProdutoQuimico] = useState("")
  const [marca, setMarca] = useState("")
  const [fornecedorId, setFornecedorId] = useState("")
  const [emailContacto, setEmailContacto] = useState("")
  const [dataRevisao, setDataRevisao] = useState("")
  const [dataValidade, setDataValidade] = useState("")
  const [temDissocianatos, setTemDissocianatos] = useState(false)
  const [pictogramasSelecionados, setPictogramasSelecionados] = useState<Set<string>>(new Set())
  const [imagem, setImagem] = useState<File | null>(null)
  const inputImagemRef = useRef<HTMLInputElement>(null)

  const [aGuardar, setAGuardar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    carregarFornecedores()
  }, [])

  function carregarFornecedores() {
    api
      .get<Pagina<FornecedorResumo>>("/fornecedores", { params: { tamanho: 100 } })
      .then((resp) => setFornecedores(resp.data.conteudo))
      .catch(() => {})
  }

  async function adicionarFornecedor() {
    if (!novoFornecedorNome.trim() || !novoFornecedorEmail.trim()) return
    try {
      const resp = await api.post<{ id: string }>("/fornecedores", {
        nome: novoFornecedorNome,
        email: novoFornecedorEmail,
        contactos: [],
      })
      await carregarFornecedores()
      setFornecedorId(resp.data.id)
      setMostrarNovoFornecedor(false)
      setNovoFornecedorNome("")
      setNovoFornecedorEmail("")
    } catch {
      setErro("Não foi possível criar o fornecedor.")
    }
  }

  function alternarPictograma(valor: string) {
    setPictogramasSelecionados((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(valor)) proximo.delete(valor)
      else proximo.add(valor)
      return proximo
    })
  }

  async function guardar() {
    setErro(null)
    if (!nomeProdutoQuimico.trim() || !marca.trim()) {
      setErro("Nome do produto químico e marca são obrigatórios.")
      return
    }
    setAGuardar(true)
    try {
      const comando: CriarFDSCommand = {
        nomeProdutoQuimico,
        marca,
        fornecedorId: fornecedorId || null,
        emailContacto: emailContacto || null,
        dataRevisao: dataRevisao || null,
        dataValidade: dataValidade || null,
        pictogramas: Array.from(pictogramasSelecionados),
      }
      const resp = await api.post<{ id: string }>("/fds", comando)

      if (imagem) {
        const formData = new FormData()
        formData.append("ficheiro", imagem)
        await api.post(`/fds/${resp.data.id}/imagem`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      }

      navigate(`/fds/${resp.data.id}`)
    } catch {
      setErro("Não foi possível guardar a ficha de dados de segurança.")
    } finally {
      setAGuardar(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h1 className="border-l-4 border-brand-700 pl-3 text-base font-semibold text-brand-800">
          Criar Ficha de Dados de Segurança
        </h1>
      </div>

      <div className="flex flex-col gap-5 px-6 py-6">
        {erro && <div className="rounded bg-red-50 px-4 py-2 text-sm text-red-700">{erro}</div>}

        <Campo label="Nome do Produto Químico">
          <input className="campo" value={nomeProdutoQuimico} onChange={(e) => setNomeProdutoQuimico(e.target.value)} />
        </Campo>

        <Campo label="Marca">
          <input className="campo" value={marca} onChange={(e) => setMarca(e.target.value)} />
        </Campo>

        <Campo label="Nome Fornecedor">
          <div className="flex items-center gap-3">
            <select className="campo" value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
              <option value="">Sem fornecedor definido</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setMostrarNovoFornecedor((v) => !v)}
              className="shrink-0 text-sm font-medium text-brand-700 hover:underline"
            >
              + Adicionar Fornecedor
            </button>
          </div>
        </Campo>

        {mostrarNovoFornecedor && (
          <div className="grid grid-cols-1 gap-3 rounded border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto]">
            <input
              className="campo"
              placeholder="Nome do fornecedor"
              value={novoFornecedorNome}
              onChange={(e) => setNovoFornecedorNome(e.target.value)}
            />
            <input
              className="campo"
              placeholder="E-mail"
              value={novoFornecedorEmail}
              onChange={(e) => setNovoFornecedorEmail(e.target.value)}
            />
            <button
              type="button"
              onClick={adicionarFornecedor}
              className="rounded bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              Guardar Fornecedor
            </button>
          </div>
        )}

        <Campo label="E-mail Fornecedor">
          <input className="campo" value={emailContacto} onChange={(e) => setEmailContacto(e.target.value)} />
        </Campo>

        <div className="grid grid-cols-2 gap-4">
          <Campo label="Data de Revisão">
            <input type="date" className="campo" value={dataRevisao} onChange={(e) => setDataRevisao(e.target.value)} />
          </Campo>
          <Campo label="Data de Validade">
            <input type="date" className="campo" value={dataValidade} onChange={(e) => setDataValidade(e.target.value)} />
          </Campo>
        </div>

        <Campo label="Imagem do Produto Químico">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => inputImagemRef.current?.click()}
              className="flex h-16 w-16 items-center justify-center rounded bg-brand-800 text-2xl text-white hover:bg-brand-900"
            >
              +
            </button>
            <input
              ref={inputImagemRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImagem(e.target.files?.[0] ?? null)}
            />
            {imagem && <span className="text-sm text-slate-600">{imagem.name}</span>}
          </div>
        </Campo>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <input type="checkbox" checked={temDissocianatos} onChange={(e) => setTemDissocianatos(e.target.checked)} />
          O produto químico tem dissocianatos
        </label>

        <div>
          <span className="mb-3 block text-sm font-semibold uppercase tracking-wide text-slate-500">
            Pictogramas de Perigo
          </span>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
            {PICTOGRAMAS.map((p) => (
              <label
                key={p.valor}
                className="flex cursor-pointer flex-col items-center gap-2 rounded border border-slate-200 p-3 text-center hover:border-brand-500"
              >
                <span className="flex h-14 w-14 rotate-45 items-center justify-center rounded border-2 border-red-500">
                  <span className="-rotate-45 text-[10px] font-bold text-red-600">GHS</span>
                </span>
                <span className="text-[11px] leading-tight text-slate-600">{p.descricao}</span>
                <input
                  type="checkbox"
                  checked={pictogramasSelecionados.has(p.valor)}
                  onChange={() => alternarPictograma(p.valor)}
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded px-4 py-2 text-sm text-slate-500 hover:bg-slate-100"
        >
          ✕ Cancelar
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={aGuardar}
          className="rounded bg-brand-800 px-5 py-2 text-sm font-medium text-white hover:bg-brand-900 disabled:opacity-60"
        >
          {aGuardar ? "A guardar…" : "🖹 Guardar"}
        </button>
      </div>
    </div>
  )
}

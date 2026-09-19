import { useEffect, useState } from "react"
import api from "../lib/api"
import type { Pagina } from "../types/fds"

interface Item {
  id: string
  nome: string
}

export default function SimpleListPage({ titulo, endpoint }: { titulo: string; endpoint: string }) {
  const [itens, setItens] = useState<Item[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    setCarregando(true)
    api
      .get<Pagina<Item>>(endpoint, { params: { tamanho: 100 } })
      .then((resp) => setItens(resp.data.conteudo))
      .finally(() => setCarregando(false))
  }, [endpoint])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-slate-700">{titulo}</h1>
      <div className="rounded-md border border-slate-200 bg-white shadow-sm">
        {carregando ? (
          <p className="px-4 py-4 text-sm text-slate-400">A carregar…</p>
        ) : itens.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-400">Sem registos.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {itens.map((item) => (
              <li key={item.id} className="px-4 py-3 text-sm text-slate-700">
                {item.nome}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

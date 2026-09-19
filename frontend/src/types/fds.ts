export type EstadoFDS = "RASCUNHO" | "ATUALIZADA" | "SOLICITADA_AO_FORNECEDOR" | "OBSOLETA"

export const PICTOGRAMAS: { valor: string; descricao: string }[] = [
  { valor: "TOXICIDADE_AGUDA_1_2_3", descricao: "Toxicidade aguda cat 1, 2 e 3" },
  { valor: "TOXICIDADE_AGUDA_4_IRRITACAO_SENSIBILIZACAO", descricao: "Toxicidade aguda cat 4 / Irritação / Sensibilização" },
  { valor: "SENSIBILIZACAO_RESPIRATORIA_CMR", descricao: "Sensibilização respiratória / CMR cat 1A, 1B e 2" },
  { valor: "PERIGOSO_AMBIENTE_AQUATICO", descricao: "Perigoso para o ambiente aquático" },
  { valor: "EXPLOSIVOS", descricao: "Explosivos" },
  { valor: "INFLAMAVEIS_PIROFORICOS", descricao: "Inflamáveis / Pirofóricos" },
  { valor: "COMBURENTES", descricao: "Comburentes" },
  { valor: "GASES_SOB_PRESSAO", descricao: "Gases sob pressão" },
  { valor: "CORROSIVOS", descricao: "Corrosivos" },
]

export const ESTADO_LABEL: Record<EstadoFDS, string> = {
  RASCUNHO: "Rascunho",
  ATUALIZADA: "Atualizada",
  SOLICITADA_AO_FORNECEDOR: "Solicitada ao Fornecedor",
  OBSOLETA: "Obsoleta",
}

export interface FDSResumo {
  id: string
  nomeProdutoQuimico: string
  marca: string
  fornecedorId: string | null
  estado: EstadoFDS
  dataRevisao: string | null
}

export interface Pagina<T> {
  conteudo: T[]
  pagina: number
  tamanho: number
  totalElementos: number
}

export interface FiltroFDSParams {
  centroProdutivoId?: string
  nome?: string
  fornecedorId?: string
  obraId?: string
  marca?: string
  estado?: EstadoFDS | ""
}

export interface CriarFDSCommand {
  nomeProdutoQuimico: string
  marca: string
  fornecedorId?: string | null
  emailContacto?: string | null
  dataRevisao?: string | null
  dataValidade?: string | null
  pictogramas?: string[]
  obrasIds?: string[]
}

export interface FornecedorResumo {
  id: string
  nome: string
}

export interface CriarFornecedorCommand {
  nome: string
  email: string
  contactos: string[]
}

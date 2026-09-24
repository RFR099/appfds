export type Role = 'director' | 'operator'
export interface User {
  id: number
  username: string
  name: string
  role: Role
  can_manage_team: boolean
}
export type Status = 'agendado' | 'em_deslocacao' | 'em_execucao' | 'concluido' | 'cancelado'

export interface ServiceRow {
  id: number
  title: string
  service_type: string
  scheduled_start: string
  scheduled_end: string
  status: Status
  started_at: string | null
  finished_at: string | null
  value: number
  fuel_cost: number
  material_cost: number
  other_cost: number
  invoice_status: 'por_faturar' | 'faturado' | 'pago'
  invoice_number: string | null
  had_problems: number | null
  city: string | null
  client_id: number
  van_id: number | null
  operator_id: number | null
  client_name: string
  van_name: string | null
  operator_name: string | null
  hours: number
  labor_cost: number
  total_cost: number
  profit: number
  team_size: number
  photo_count: number
  margin?: number | null
}

export interface Finance {
  value: number
  hours: number
  labor_cost: number
  fuel_cost: number
  material_cost: number
  other_cost: number
  total_cost: number
  profit: number
  margin: number | null
}

export interface TimelineEvent {
  id?: number
  at: string
  type: string
  message: string
  actor_name?: string | null
  actor_role?: string | null
  client_name?: string
  service_id?: number
}

export interface Issue {
  id: number
  category: string
  description: string | null
  created_at: string
}

export interface ServiceFull {
  id: number
  title: string
  service_type: string
  address: string | null
  city: string | null
  instructions: string | null
  scheduled_start: string
  scheduled_end: string
  value: number
  status: Status
  travel_started_at: string | null
  started_at: string | null
  finished_at: string | null
  completed_ok: number | null
  had_problems: number | null
  observations: string | null
  fuel_cost: number
  material_cost: number
  other_cost: number
  invoice_status: 'por_faturar' | 'faturado' | 'pago'
  invoice_number: string | null
  invoiced_at: string | null
  paid_at: string | null
  client_id: number
  van_id: number | null
  operator_id: number | null
  team_id: number | null
  created_at: string
  created_by_name: string | null
  client: { id: number; name: string; type: string; contact_name: string | null; phone: string | null; email: string | null; nif: string | null }
  van: { id: number; name: string; plate: string; model: string | null } | null
  operator: { id: number; name: string; username: string; phone: string | null } | null
  employees: { id: number; name: string; job_title: string; hourly_rate: number; is_leader: number; present: number | null }[]
  issues: Issue[]
  photos: { id: number; original_name: string | null; created_at: string }[]
  events: TimelineEvent[]
  finance: Finance
  conflicts: { van: { id: number; title: string }[]; operator: { id: number; title: string }[] }
}

export interface Agg {
  services: number
  revenue: number
  labor: number
  fuel: number
  materials: number
  other: number
  hours: number
  total_cost: number
  profit: number
  margin: number | null
}
export interface GroupAgg extends Agg {
  key: number | string | null
  label: string
}
export interface MonthAgg extends Agg {
  month: string
  overhead: number
  net: number
}

export interface Alert {
  key: string
  type: string
  severity: 'alta' | 'media' | 'info'
  service_id: number
  at: string
  title: string
  detail: string
  read: boolean
}

export interface Lookups {
  clients: { id: number; name: string; type: string; address: string | null; city: string | null }[]
  vans: { id: number; name: string; plate: string; status: string }[]
  operators: { id: number; name: string; employee_id: number | null; active: number }[]
  employees: { id: number; name: string; job_title: string; hourly_rate: number; status: string }[]
  teams: { id: number; name: string; van_id: number | null; leader_user_id: number | null; member_ids: number[] }[]
  service_types: string[]
  client_types: string[]
  expense_categories: string[]
}

/* ---- Operador (sem dados financeiros) ---- */
export interface OpServiceRow {
  id: number
  title: string
  service_type: string
  address: string | null
  city: string | null
  scheduled_start: string
  scheduled_end: string
  status: Status
  started_at: string | null
  finished_at: string | null
  had_problems: number | null
  client_name: string
  van_name: string | null
  team_size: number
}
export interface OpService {
  id: number
  title: string
  service_type: string
  client: { name: string; contact_name: string | null; phone: string | null }
  address: string | null
  city: string | null
  instructions: string | null
  scheduled_start: string
  scheduled_end: string
  status: Status
  travel_started_at: string | null
  started_at: string | null
  finished_at: string | null
  completed_ok: number | null
  had_problems: number | null
  observations: string | null
  van: { id: number; name: string; plate: string; model: string | null } | null
  leader_name: string | null
  team: { id: number; name: string; is_leader: number; present: number | null }[]
  issues: Issue[]
  photos: { id: number; created_at: string }[]
  events: TimelineEvent[]
}

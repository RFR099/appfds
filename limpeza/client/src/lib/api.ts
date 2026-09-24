export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'X-Requested-With': 'limpeza-app' }
  let payload: BodyInit | undefined
  if (body instanceof FormData) payload = body
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(`/api${url}`, { method, headers, body: payload, credentials: 'same-origin' })
  const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : null
  if (!res.ok) {
    if (res.status === 401 && !url.startsWith('/auth/login')) onUnauthorized?.()
    throw new ApiError(res.status, data?.error ?? `Erro ${res.status}`)
  }
  return data as T
}

export const api = {
  get: <T,>(url: string) => request<T>('GET', url),
  post: <T,>(url: string, body?: unknown) => request<T>('POST', url, body ?? {}),
  put: <T,>(url: string, body?: unknown) => request<T>('PUT', url, body ?? {}),
  del: <T,>(url: string) => request<T>('DELETE', url),
}

export function qs(params: Record<string, string | number | undefined | null | boolean>) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '' && v !== false) p.set(k, String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

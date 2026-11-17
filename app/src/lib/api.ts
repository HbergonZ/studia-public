const API_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

let sessionCsrfToken = ''
export function setCsrfToken(token: string) { sessionCsrfToken = token }

export class ApiError extends Error {
  status: number
  errors?: Record<string, string[]>

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[]>,
  ) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

function csrfToken() {
  return document.cookie
    .split('; ')
    .find((item) => item.startsWith('csrf_cookie_name='))
    ?.split('=')[1]
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  headers.set('Accept', 'application/json')
  const csrf = sessionCsrfToken || csrfToken()
  if (csrf) headers.set('X-CSRF-TOKEN', decodeURIComponent(csrf))

  let response: Response
  try { response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  }) } catch { throw new ApiError('Sem conexão com o servidor. Confira sua internet e tente novamente. Seus dados não foram descartados.', 0) }
  const rotatedToken = response.headers.get('X-CSRF-TOKEN')
  if (rotatedToken) setCsrfToken(rotatedToken)
  const contentType = response.headers.get('content-type') ?? ''
  const raw = await response.text()
  let body: unknown = null
  try { body = raw && contentType.includes('json') ? JSON.parse(raw) : null } catch { /* A proxy may return an HTML error instead of JSON. */ }
  const payload = body as { code?: string; message?: string; messages?: { error?: string }; error?: { message?: string }; errors?: Record<string, string[]> } | null
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login' && path !== '/v1/me') window.dispatchEvent(new Event('studia:session-expired'))
    if (response.status === 403 && payload?.code === 'password_change_required') {
      window.dispatchEvent(new Event('studia:password-change-required'))
    }
    const message = payload?.message ?? payload?.messages?.error ?? payload?.error?.message
    throw new ApiError(message || (response.status >= 500 ? 'O servidor está indisponível. Tente novamente em alguns instantes.' : 'Não foi possível concluir a solicitação.'), response.status, payload?.errors)
  }
  return body as T
}

export const apiUrl = API_URL

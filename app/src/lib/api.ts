const API_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

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
  const csrf = csrfToken()
  if (csrf) headers.set('X-CSRF-TOKEN', decodeURIComponent(csrf))

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })
  const contentType = response.headers.get('content-type') ?? ''
  const body = contentType.includes('json') ? await response.json() : await response.text()
  if (!response.ok) {
    const message = typeof body === 'string'
      ? body
      : body?.message ?? body?.messages?.error ?? body?.error?.message
    throw new ApiError(message || 'Não foi possível concluir a solicitação.', response.status, typeof body === 'object' ? body?.errors : undefined)
  }
  return body as T
}

export const apiUrl = API_URL

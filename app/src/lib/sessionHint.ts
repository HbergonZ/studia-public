// A display hint only. Authentication and permissions always come from the API.
const KEY = 'studia:session-known'

export function hasSessionHint(): boolean {
  try { return window.localStorage.getItem(KEY) === '1' }
  catch { return false }
}

export function setSessionHint(active: boolean): void {
  try {
    if (active) window.localStorage.setItem(KEY, '1')
    else window.localStorage.removeItem(KEY)
  } catch { /* Storage may be unavailable; authentication must still work. */ }
}

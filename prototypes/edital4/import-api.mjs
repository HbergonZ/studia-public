// Teste real opcional: usa a OpenRouter configurada e suas cotas gratuitas.
// Executar da raiz: node prototypes/edital4/import-api.mjs
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const cookies = new Map()
let userId
async function request(path, method = 'GET', body, expected = 200) {
  const multipart = body instanceof FormData
  const response = await fetch('http://localhost:8088/api' + path, {
    method,
    headers: { ...(multipart ? {} : { 'Content-Type': 'application/json' }), Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') },
    body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
  })
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(';')[0], separator = pair.indexOf('=')
    cookies.set(pair.slice(0, separator), pair.slice(separator + 1))
  }
  const data = await response.json()
  assert.equal(response.status, expected, JSON.stringify({ message: data.message, attempts: data.attempts }))
  return data
}
try {
  const password = randomUUID() + 'aA1!'
  const user = await request('/auth/register', 'POST', {
    email: `teste-editais-${randomUUID().slice(0, 8)}@example.com`, password, password_confirm: password,
  }, 201)
  userId = Number(user.user.id)
  const notice = await request('/v1/editais', 'POST', { title: 'Teste edital4', source: 'pdf' }, 201)
  const form = new FormData()
  form.append('file', new Blob([await readFile('exemplos_editais/edital4.pdf')], { type: 'application/pdf' }), 'edital4.pdf')
  const result = await request(`/v1/editais/${notice.id}/extrair`, 'POST', form)
  assert.equal(result.status, 'extracted')
  const dashboard = await request(`/v1/dashboard?edital_id=${notice.id}`)
  assert.match(dashboard.edital.nome, /NAV BRASIL/i)
  assert.equal(dashboard.edital.temConteudoProgramatico, false)
  const saved = await request(`/v1/editais/${notice.id}`)
  assert.deepEqual(saved.subjects, [])
  await request(`/v1/editais/${notice.id}/ativar`, 'POST', undefined, 400)
  console.log(JSON.stringify({ title: dashboard.edital.nome, has_study_syllabus: false, attempts: result.attempts }, null, 2))
} finally {
  if (Number.isSafeInteger(userId) && userId > 0) {
    execFileSync('docker', ['compose', 'exec', '-T', 'postgres', 'sh', '-c', 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'], {
      input: `DELETE FROM users WHERE id=${userId} AND username LIKE 'teste_editais_%';`, stdio: ['pipe', 'pipe', 'pipe'],
    })
  }
}

// Imports only captured successful live-provider responses into an isolated fixture.
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
const fixture = JSON.parse(readFileSync('/fixtures/testing/admin-users.json', 'utf8'))
const directory = '/fixtures/testing/live-ai-editais'
const base = 'http://host.docker.internal:8088/api'
const cookies = new Map(); let csrf = ''
async function api(path, method = 'GET', body, expected = 200) {
  const r = await fetch(base + path, {method, headers: {'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, Cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join('; ')}, body: body === undefined ? undefined : JSON.stringify(body)})
  for (const cookie of r.headers.getSetCookie()) { const pair = cookie.split(';')[0], i = pair.indexOf('='); cookies.set(pair.slice(0,i), pair.slice(i+1)) }
  const value = await r.json()
  if (r.headers.has('X-CSRF-TOKEN')) csrf = r.headers.get('X-CSRF-TOKEN')
  if (value.user?.csrfToken) csrf = value.user.csrfToken
  assert.equal(r.status, expected, `${method} ${path}: ${JSON.stringify(value.message ?? value.messages ?? '')}`)
  return value
}
await api('/auth/login', 'POST', {email: fixture.email, password: fixture.password})
const reports = []
for (const file of readdirSync(directory).filter(f => f.endsWith('-structure.json'))) {
  const value = JSON.parse(readFileSync(directory + '/' + file, 'utf8'))
  const notice = await api('/v1/editais', 'POST', {title: 'Teste real de IA: ' + file.slice(0, 130), source: 'text'}, 201)
  await api(`/v1/editais/${notice.id}/importar-resposta`, 'POST', {response: JSON.stringify(value)})
  let board = await api(`/v1/dashboard?edital_id=${notice.id}`)
  assert.equal(board.opcoes.length, value.options.length)
  assert.equal(board.edital.temConteudoProgramatico, value.has_study_syllabus)
  for (const group of value.groups) for (const subject of group.subjects) {
    const stored = board.materias.find(s => s.grupoNome === group.name && s.nome === subject.name)
    assert.ok(stored)
    assert.deepEqual(stored.topicos.map(t => t.nome), subject.topics)
  }
  if (value.has_study_syllabus) {
    const option = board.opcoes[0]
    if (option) await api(`/v1/editais/${notice.id}/opcoes/${option.id}`, 'PATCH', {selected: true})
    await api(`/v1/editais/${notice.id}/ativar`, 'POST')
    board = await api('/v1/dashboard')
    assert.equal(String(board.edital.id), String(notice.id))
    await api('/v1/configuracao', 'PUT', {availability: Object.fromEntries(Array.from({length: 7}, (_, i) => [i, 120])), block_minutes: 25, break_minutes: 5})
    const plan = await api('/v1/plano')
    assert.ok(plan.blocks.length > 0)
  } else {
    assert.equal(board.materias.length, 0)
    await api(`/v1/editais/${notice.id}/ativar`, 'POST', undefined, 400)
  }
  reports.push({file, options: board.opcoes.length, subjects: board.materias.length, topics: board.materias.reduce((n,s) => n + s.topicos.length, 0), status: 'passed'})
  console.log('PASS import/storage/selection/plan:', file)
}
assert.ok(reports.length > 0)
writeFileSync(directory + '/import-results.json', JSON.stringify(reports, null, 2))
console.log('PASS: captured responses survive import unchanged; empty-syllabus activation blocked. This verifies storage, not completeness against the PDF.')

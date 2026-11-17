// Execute na raiz do projeto com Docker ativo: node server/tests/api/editais.mjs
// Usa contas temporárias e remove apenas essas contas ao terminar.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const base = 'http://localhost:8088/api'
const usuarios = []

function cliente() {
  const cookies = new Map()
  return async (path, method = 'GET', body, status = 200) => {
    const response = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';')[0]; const separator = pair.indexOf('=')
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1))
    }
    const data = await response.json()
    assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(data).slice(0, 500)}`)
    return data
  }
}

async function registrar(request) {
  const password = randomUUID() + 'aA1!'
  const data = await request('/auth/register', 'POST', {
    email: `teste-editais-${randomUUID().slice(0, 8)}@example.com`, password, password_confirm: password,
  }, 201)
  usuarios.push(Number(data.user.id))
}

async function criarConteudo(request, title) {
  const notice = await request('/v1/editais', 'POST', { title, source: 'manual' }, 201)
  const subject = await request(`/v1/editais/${notice.id}/materias`, 'POST', { name: 'Matéria de teste' }, 201)
  const topic = await request(`/v1/materias/${subject.id}/topicos`, 'POST', { name: 'Tópico de teste' }, 201)
  return { id: notice.id, subject: subject.id, topic: topic.id }
}

try {
  const a = cliente(), b = cliente()
  await cliente()('/v1/editais', 'GET', undefined, 401)
  await registrar(a); await registrar(b)
  const importado = await a('/v1/editais', 'POST', { title: 'Nome provisório', source: 'text' }, 201)
  const resposta = { title: 'Universidade - Edital 01/2026', has_study_syllabus: false, extraction_complete: true, options: [], groups: [], warnings: [] }
  await a(`/v1/editais/${importado.id}/importar-resposta`, 'POST', { response: JSON.stringify(resposta) })
  assert.equal((await a(`/v1/dashboard?edital_id=${importado.id}`)).edital.nome, resposta.title, 'Importação preenche o nome gerado')
  await a(`/v1/editais/${importado.id}`, 'PATCH', { title: 'Nome editado' })
  delete resposta.title
  await a(`/v1/editais/${importado.id}/importar-resposta`, 'POST', { response: JSON.stringify(resposta) })
  assert.equal((await a(`/v1/dashboard?edital_id=${importado.id}`)).edital.nome, 'Nome editado', 'JSON antigo preserva o nome existente')
  await a(`/v1/editais/${importado.id}`, 'DELETE')
  await a('/v1/editais', 'POST', { title: ' ' }, 400)
  await a('/v1/editais', 'POST', { title: 'x'.repeat(181) }, 400)
  const primeiro = await criarConteudo(a, 'Primeiro edital')
  await a(`/v1/editais/${primeiro.id}/ativar`, 'POST')
  await a('/v1/sessoes', 'POST', { topic_id: primeiro.topic, minutes: 25, correct_answers: 2, wrong_answers: 1 }, 201)
  const segundo = await criarConteudo(a, 'Segundo edital')
  assert.equal(String((await a('/v1/dashboard')).edital.id), String(primeiro.id), 'Criar rascunho não troca o ativo')
  assert.equal((await a('/v1/dashboard')).sessoes.length, 1)
  assert.equal(String((await a(`/v1/dashboard?edital_id=${segundo.id}`)).edital.id), String(segundo.id))
  assert.equal(String((await a('/v1/dashboard')).edital.id), String(primeiro.id), 'Revisar não ativa')

  for (const action of ['ativar', 'desativar', 'finalizar']) await b(`/v1/editais/${primeiro.id}/${action}`, 'POST', undefined, 404)
  await b(`/v1/editais/${primeiro.id}`, 'DELETE', undefined, 404)
  await b(`/v1/editais/${primeiro.id}`, 'PATCH', { title: 'Outro usuário' }, 404)
  await b(`/v1/dashboard?edital_id=${primeiro.id}`, 'GET', undefined, 404)
  assert.deepEqual(await b('/v1/editais'), [])

  await a(`/v1/editais/${segundo.id}/ativar`, 'POST')
  const lista = await a('/v1/editais')
  assert.equal(lista.filter((n) => n.status === 'confirmed').length, 1)
  assert.equal(lista.find((n) => String(n.id) === String(primeiro.id)).status, 'inactive')
  assert.equal((await a('/v1/dashboard')).sessoes.length, 0, 'Histórico pertence ao edital selecionado')
  await a('/v1/sessoes', 'POST', { topic_id: primeiro.topic, minutes: 10 }, 404)
  await a(`/v1/editais/${segundo.id}/finalizar`, 'POST')
  assert.equal((await a('/v1/dashboard')).edital, null)
  assert.deepEqual(await a('/v1/cronograma'), [])
  assert.equal((await a('/v1/editais')).find((n) => String(n.id) === String(segundo.id)).status, 'completed')
  await a(`/v1/editais/${primeiro.id}/ativar`, 'POST')
  assert.equal((await a('/v1/dashboard')).sessoes.length, 1, 'Reativação preserva sessões')
  await a(`/v1/editais/${segundo.id}/ativar`, 'POST')
  await a(`/v1/editais/${segundo.id}`, 'PATCH', { title: 'Edital renomeado' })
  assert.equal((await a('/v1/dashboard')).edital.nome, 'Edital renomeado')
  await a(`/v1/editais/${segundo.id}/desativar`, 'POST')
  assert.equal((await a('/v1/dashboard')).edital, null, 'Não ativa outro edital automaticamente')
  await a(`/v1/editais/${segundo.id}/ativar`, 'POST')
  await a(`/v1/editais/${segundo.id}`, 'DELETE')
  assert.equal((await a('/v1/dashboard')).edital, null)
  assert.deepEqual(await a('/v1/cronograma'), [], 'Edital excluído não aparece no cronograma')
  await a(`/v1/dashboard?edital_id=${segundo.id}`, 'GET', undefined, 404)
  await a(`/v1/editais/${segundo.id}/ativar`, 'POST', undefined, 404)
  await a(`/v1/materias/${segundo.subject}`, 'PATCH', { name: 'Alteração indevida' }, 404)
  await a('/v1/sessoes', 'POST', { topic_id: segundo.topic, minutes: 10 }, 404)
  assert.equal((await a('/v1/editais')).length, 1)
  console.log('OK: criação, revisão, ativação, histórico, finalização, reativação, exclusão e isolamento entre usuários.')
} finally {
  if (usuarios.length) {
    assert(usuarios.every((id) => Number.isSafeInteger(id) && id > 0))
    execFileSync('docker', ['compose', 'exec', '-T', 'postgres', 'sh', '-c', 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'], {
      input: `DELETE FROM users WHERE id IN (${usuarios.join(',')}) AND username LIKE 'teste_editais_%';`,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
  }
}

// Isolated, deterministic API test. No external AI calls.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
const fixture = JSON.parse(readFileSync('/fixtures/testing/admin-users.json', 'utf8'))
const base = 'http://host.docker.internal:8088/api'
function client() {
  const cookies = new Map(); let csrf = ''
  return async (path, method = 'GET', body, expected = 200, token = true) => {
    const multipart = body instanceof FormData
    const r = await fetch(base + path, {method, headers: {...(multipart ? {} : {'Content-Type': 'application/json'}), ...(token ? {'X-CSRF-TOKEN': csrf} : {}), Cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join('; ')}, body: body === undefined ? undefined : multipart ? body : JSON.stringify(body)})
    for (const cookie of r.headers.getSetCookie()) { const pair = cookie.split(';')[0], i = pair.indexOf('='); cookies.set(pair.slice(0,i), pair.slice(i+1)) }
    const value = await r.json()
    if (r.headers.has('X-CSRF-TOKEN')) csrf = r.headers.get('X-CSRF-TOKEN')
    if (value.user?.csrfToken) csrf = value.user.csrfToken
    assert.equal(r.status, expected, `${method} ${path}: ${JSON.stringify(value.message ?? value.messages ?? '')}`)
    return value
  }
}
function pdf(pages) {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${pages.map((_, i) => `${4+i*2} 0 R`).join(' ')}] /Count ${pages.length} >>`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>']
  for (const lines of pages) {
    const page = objects.length + 1
    const stream = 'BT /F1 12 Tf 16 TL 72 740 Td ' + lines.map(s => '(' + s.replaceAll('\\','\\\\').replaceAll('(','\\(').replaceAll(')','\\)') + ') Tj T*').join(' ') + ' ET'
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${page+1} 0 R >>`, `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`)
  }
  let output = '%PDF-1.4\n'; const offsets = [0]
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(output)); output += `${i+1} 0 obj\n${object}\nendobj\n` })
  const xref = Buffer.byteLength(output)
  output += `xref\n0 ${objects.length+1}\n0000000000 65535 f \n` + offsets.slice(1).map(o => `${String(o).padStart(10,'0')} 00000 n \n`).join('') + `trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return Buffer.from(output)
}
const file = pdf([['EDITAL DE TESTE', '725 - Enfermeiro', '602 - Enfermeiro do Trabalho'], ['CONHECIMENTOS GERAIS - SUPERIOR','Portugues','Interpretacao de texto.'], ['725 - Enfermeiro', 'CONHECIMENTOS ESPECIFICOS', 'Biosseguranca. Seguranca do paciente.']])
writeFileSync('/fixtures/testing/job-import.pdf', file)
const a = client(); await a('/auth/login', 'POST', {email: fixture.email, password: fixture.password})
const notice = await a('/v1/editais', 'POST', {title: 'Teste importacao por cargo', source: 'pdf'}, 201)
const endpoint = `/v1/editais/${notice.id}/importacao-cargo`
function upload() { const form = new FormData(); form.append('file', new Blob([file], {type: 'application/pdf'}), 'teste.pdf'); return form }
let state = await a(endpoint + '/preparar', 'POST', upload())
assert.equal(state.status, 'ready'); assert.equal(state.revision, 1)
await a(endpoint + '/repair', 'POST', {revision: state.revision}, 403, false)
await a(endpoint + '/resolver', 'POST', {revision: state.revision}, 403, false)
assert.equal((await a(endpoint + '/preparar', 'POST', upload())).revision, 1, 'retry with the same PDF preserves progress')
const prompt = await a(endpoint + '/prompt?stage=inventory')
const line = text => { const match = prompt.prompt.match(new RegExp('\\[L(\\d+)\\] '+text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))); assert.ok(match, text); return Number(match[1]) }
const inventory = {title: 'Edital de teste', has_study_syllabus: true, options: [{ref: '725', code: '725', name: 'Enfermeiro', kind: 'job', level: 'Superior', source_line: line('725 - Enfermeiro'), general_expected: true, specific_expected: true}], syllabus_pages: [2,3], warnings: []}
await a(endpoint + '/inventory', 'POST', {revision: state.revision, response: JSON.stringify(inventory)}, 403, false)
state = await a(endpoint + '/inventory', 'POST', {revision: state.revision, response: JSON.stringify(inventory)})
assert.equal(state.inventory.options.length, 1)
await a(endpoint + '/selecionar', 'POST', {revision: 1, option_ref: '725'}, 409)
state = await a(endpoint + '/selecionar', 'POST', {revision: state.revision, option_ref: '725'})
const scopedPrompt = await a(endpoint + '/prompt?stage=content')
assert.ok(!scopedPrompt.prompt.includes('[L' + line('602 - Enfermeiro do Trabalho') + ']'), 'unrelated table page is not sent to content extraction')
const specific = [...prompt.prompt.matchAll(/\[L(\d+)\] 725 - Enfermeiro/g)].at(-1)
const content = {option_ref: '725', complete: true, sections: [{name: 'Portugues', knowledge_type: 'general', start_line: line('Portugues'), end_line: line('Interpretacao de texto.'), evidence_line: line('CONHECIMENTOS GERAIS - SUPERIOR')}, {name: 'Enfermagem', knowledge_type: 'specific', start_line: Number(specific[1]), end_line: line('Biosseguranca. Seguranca do paciente.'), evidence_line: Number(specific[1])}], warnings: []}
const invalid = structuredClone(content); invalid.sections[1].end_line = invalid.sections[1].start_line-1
await a(endpoint + '/content', 'POST', {revision: state.revision, response: JSON.stringify(invalid)}, 422)
state = await a(endpoint); assert.equal(state.selected_ref, '725'); assert.equal(state.content, null)
state = await a(endpoint + '/content', 'POST', {revision: state.revision, response: JSON.stringify(content)})
assert.ok(state.content.sections[1].source.includes('Seguranca do paciente.'))
await a(endpoint + '/aplicar', 'POST', {revision: state.revision}, 422)
await a(endpoint + '/aplicar', 'POST', {revision: state.revision, confirmed: true})
await a(endpoint + '/aplicar', 'POST', {revision: state.revision, confirmed: true})
const board = await a(`/v1/dashboard?edital_id=${notice.id}`)
assert.equal(board.opcoes.length, 1); assert.equal(board.opcoes[0].selecionada, true)
assert.equal(board.materias.length, 2); assert.ok(board.materias.flatMap(s => s.topicos).every(t => t.origemId && t.textoOriginal))
await a(endpoint + '/preparar', 'POST', upload(), 409)
const otherEmail = fixture.prefix+'-scope-'+randomUUID().slice(0,6)+'@example.com'
const other = client(), created = await a('/v1/admin/users', 'POST', {email: otherEmail}, 201)
const password = created.message.match(/Senha temporária: (\S+)/)[1]
await other('/auth/login', 'POST', {email: otherEmail, password})
const permanentPassword = randomUUID() + 'aA!9'
await other('/auth/change-password', 'POST', {current_password: password, password: permanentPassword, password_confirm: permanentPassword})
await other(endpoint, 'GET', undefined, 404); await other(endpoint+'/prompt?stage=inventory','GET',undefined,404)
await other(endpoint+'/repair','POST',{revision: 1},404)
await other(endpoint+'/resolver','POST',{revision: 1, confirmed: true},404)
// Leave an untouched prepared draft for the browser's complete manual flow.
const browserNotice = await a('/v1/editais', 'POST', {title: 'Teste visual por cargo', source: 'pdf'}, 201)
await a(`/v1/editais/${browserNotice.id}/importacao-cargo/preparar`, 'POST', upload())
writeFileSync('/fixtures/testing/job-import-fixture.json', JSON.stringify({id: browserNotice.id, inventory, content}, null, 2))
console.log('PASS: PDF upload/idempotency, numbered and scoped prompts, CSRF, stale revision, failed content preserves selection, literal source, apply confirmation/idempotency, selected job, existing catalog protection and account isolation. No external AI call.')

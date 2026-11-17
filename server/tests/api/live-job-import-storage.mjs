// Replays only successful reports from the four remaining live samples.
// No external AI calls. Requires the isolated admin-users fixture and /pdfs mount.
import assert from 'node:assert/strict'
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
const dir = '/fixtures/testing/live-job-import/'
const fixture = JSON.parse(readFileSync('/fixtures/testing/admin-users.json', 'utf8'))
const cookies = new Map(); let csrf = ''
async function api(path, method = 'GET', body, expected = 200) {
  const multipart = body instanceof FormData
  const response = await fetch('http://host.docker.internal:8088/api' + path, {
    method, headers: { Cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join('; '), 'X-CSRF-TOKEN': csrf, ...(multipart ? {} : {'Content-Type': 'application/json'}) },
    body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
  })
  for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(';')[0], i = pair.indexOf('='); cookies.set(pair.slice(0,i), pair.slice(i+1)) }
  const value = await response.json()
  if (response.headers.has('X-CSRF-TOKEN')) csrf = response.headers.get('X-CSRF-TOKEN')
  if (value.user?.csrfToken) csrf = value.user.csrfToken
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(value.message ?? '')}`)
  return value
}
const read = path => JSON.parse(readFileSync(dir + path, 'utf8'))
const reports = []
for (const provider of ['gemini','openrouter']) {
  const latest = new Map(read(provider + '-remaining-results.json').map(r => [r.file,r]))
  // Targeted reruns supersede the original sample outcome, including failures.
  for (const stem of ['edital-retificado-dataprev','edital2','edital4','edital5']) {
    const path = `${provider}-${stem}-results.json`
    if (existsSync(dir + path)) for (const report of read(path)) latest.set(report.file, report)
  }
  reports.push(...latest.values())
}
await api('/auth/login', 'POST', { email: fixture.email, password: fixture.password })
const output = []
for (const report of reports.filter(r => ['passed','passed_no_syllabus'].includes(r.status))) {
  const stem = report.file.replace(/\.pdf$/, '')
  const inventory = read(`${report.provider}-${stem}-inventory.json`).structure
  const notice = await api('/v1/editais', 'POST', {title: 'Teste real por cargo: ' + stem, source: 'pdf'}, 201)
  const endpoint = `/v1/editais/${notice.id}/importacao-cargo`
  const form = new FormData()
  form.append('file', new Blob([readFileSync('/pdfs/' + report.file)], {type: 'application/pdf'}), report.file)
  let state = await api(endpoint + '/preparar', 'POST', form)
  state = await api(endpoint + '/inventory', 'POST', {revision: state.revision, response: JSON.stringify(inventory)})
  assert.equal(state.inventory.has_study_syllabus, inventory.has_study_syllabus)
  if (report.status === 'passed_no_syllabus') {
    assert.ok(state.inventory.warnings.length)
    await api(endpoint + '/aplicar', 'POST', {revision: state.revision, confirmed: true}, 422)
    assert.equal((await api(`/v1/dashboard?edital_id=${notice.id}`)).materias.length, 0)
  } else {
    const content = read(`${report.provider}-${stem}-content.json`).structure
    state = await api(endpoint + '/selecionar', 'POST', {revision: state.revision, option_ref: content.option_ref})
    state = await api(endpoint + '/content', 'POST', {revision: state.revision, response: JSON.stringify(content)})
    assert.deepEqual(state.content.sections.map(s => s.source), content.sections.map(s => s.source), 'Actual PDF extraction preserves line positions and source')
    if (state.document.needs_confirmation && !state.document_confirmed) {
      await api(endpoint + '/confirmar-documento', 'POST', {revision: state.revision, confirmed: false}, 422)
      state = await api(endpoint + '/confirmar-documento', 'POST', {revision: state.revision, confirmed: true})
      assert.equal(state.document_confirmed, true)
    }
    if (state.coverage.pending.length) {
      await api(endpoint + '/aplicar', 'POST', {revision: state.revision, confirmed: true}, 409)
      const first = state.coverage.pending[0]
      await api(endpoint + '/resolver', 'POST', {revision: state.revision, gap_id: first.id, decision: 'not_applicable', reason: 'Sem confirmação explícita', confirmed: false}, 422)
      state = await api(endpoint)
      const forged = {...content, coverage_decisions: [{gap_id: first.id, decision: 'not_applicable', reason: 'Inventado na resposta da IA'}]}
      state = await api(endpoint + '/content', 'POST', {revision: state.revision, response: JSON.stringify(forged)})
      assert.ok(state.coverage.pending.length, 'AI cannot forge a user decision')
      const invalid = {option_ref: content.option_ref, complete: true, sections: [content.sections[0]], warnings: []}
      await api(endpoint + '/repair', 'POST', {revision: state.revision, response: JSON.stringify(invalid)}, 422)
      state = await api(endpoint)
      assert.deepEqual(state.content.sections.map(s => s.source), content.sections.map(s => s.source), 'Failed repair keeps accepted sections')
      // Exercise human resolution, then replace content to invalidate the decision.
      state = await api(endpoint + '/resolver', 'POST', {revision: state.revision, gap_id: state.coverage.pending[0].id, decision: 'not_applicable', reason: 'Decisão temporária para testar a invalidação da revisão em conta isolada.', confirmed: true})
      assert.equal(state.coverage.decisions.length, 1)
      state = await api(endpoint + '/resolver', 'POST', {revision: state.revision, gap_id: state.coverage.decisions[0].gap_id, decision: 'reopen', confirmed: true})
      assert.ok(state.coverage.pending.length, 'Human decision can be reopened without another AI call')
      assert.equal(state.coverage.decisions.length, 0)
      state = await api(endpoint + '/content', 'POST', {revision: state.revision, response: JSON.stringify(content)})
      assert.ok(state.coverage.pending.length, 'Replacing content clears previous decisions')
      const repair = {option_ref: content.option_ref, complete: true, sections: state.coverage.pending.map(g => ({name: 'Complemento do programa', knowledge_type: g.knowledge_type, start_line: g.start_line, end_line: g.end_line, evidence_line: g.start_line})), warnings: []}
      state = await api(endpoint + '/repair', 'POST', {revision: state.revision, response: JSON.stringify(repair)})
      assert.equal(state.coverage.pending.length, 0, 'Known omissions repaired without replacing accepted text')
    }
    const expectedSources = state.content.sections.map(s => s.source)
    await api(endpoint + '/aplicar', 'POST', {revision: state.revision, confirmed: true})
    const board = await api(`/v1/dashboard?edital_id=${notice.id}`)
    assert.equal(board.opcoes.length, 1)
    assert.equal(board.opcoes[0].selecionada, true)
    assert.equal(board.materias.length, expectedSources.length)
    const stored = board.origens.map(s => s.textoOriginal).sort()
    assert.deepEqual(stored, expectedSources.sort())
    for (const subject of board.materias) {
      const original = board.origens.find(s => s.materiaId === subject.id)
      const normalize = value => value.replace(/\s/gu,'')
      assert.equal(normalize(subject.topicos.map(t => t.textoOriginal).join('')), normalize(original.textoOriginal), 'Units preserve full source in order without omissions or duplications')
      assert.equal(new Set(subject.topicos.map(t => t.nome)).size, subject.topicos.length)
      assert.ok(subject.topicos.every(t => t.origemId === original.id))
    }
  }
  output.push({provider: report.provider, file: report.file, status: 'passed', scope: report.status === 'passed_no_syllabus' ? 'absence of syllabus preserved; apply blocked' : 'PDF upload, inventory, selection, literal preview, apply, selected job and original source persistence'})
  console.log('PASS:', report.provider, report.file)
}
assert.ok(output.length, 'At least one captured successful result must be checked')
// Leave a separate pending draft for the browser regression, never the user's account.
{
  const stem = 'edital-retificado-dataprev'
  const inventory = read(`openrouter-${stem}-inventory.json`).structure
  const content = read(`openrouter-${stem}-content.json`).structure
  const notice = await api('/v1/editais', 'POST', {title: 'Conferência visual de pendências', source: 'pdf'}, 201)
  const endpoint = `/v1/editais/${notice.id}/importacao-cargo`
  const form = new FormData(); form.append('file', new Blob([readFileSync('/pdfs/' + stem + '.pdf')], {type: 'application/pdf'}), stem + '.pdf')
  let state = await api(endpoint + '/preparar', 'POST', form)
  state = await api(endpoint + '/inventory', 'POST', {revision: state.revision, response: JSON.stringify(inventory)})
  state = await api(endpoint + '/selecionar', 'POST', {revision: state.revision, option_ref: content.option_ref})
  state = await api(endpoint + '/content', 'POST', {revision: state.revision, response: JSON.stringify(content)})
  assert.ok(state.coverage.pending.length)
  const repair = {option_ref: content.option_ref, complete: true, sections: state.coverage.pending.map(g => ({name: 'Gestão e Governança de TI', knowledge_type: g.knowledge_type, start_line: g.start_line, end_line: g.end_line, evidence_line: g.start_line})), warnings: []}
  writeFileSync('/fixtures/testing/coverage-browser-fixture.json', JSON.stringify({id: notice.id, repair}))
}
writeFileSync(dir + 'remaining-storage-results.json', JSON.stringify(output, null, 2))
console.log('PASS: successful captured outcomes replayed against real PDF uploads. This checks integration, not documentary completeness.')
